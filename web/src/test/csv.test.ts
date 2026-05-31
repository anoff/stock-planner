import { describe, it, expect } from "vitest";
import {
  parseTrades,
  parseRakutenTrades,
  resolveFundTicker,
  decodeFile,
  deduplicateTrades,
  parseDABTrades,
  resolveDABTicker,
  isDABFormat,
  isRakutenFormat,
} from "../utils/csv";
import type { Trade } from "../utils/types";

describe("parseTrades", () => {
  it("parses JP stock buy trades from CSV text", () => {
    const csv = [
      "約定日,受渡日,銘柄コード,銘柄名,市場名称,口座区分,取引区分,売買区分,信用区分,弁済期限,数量［株］,単価［円］,手数料［円］,税金等［円］,諸費用［円］,税区分,受渡金額［円］",
      '"2025/06/15","2025/06/17","7267","本田技研","東証","特定","現物","買付","-","-","100","1,602.5","0","0","0","-","160,250"',
      '"2025/07/01","2025/07/03","3436","ＳＵＭＣＯ","東証","特定","現物","売付","-","-","200","1,400","0","0","0","-","280,000"',
    ].join("\n");

    const trades = parseTrades(csv);

    expect(trades).toHaveLength(2); // Both buy and sell trades
    const buy = trades.find((t) => t.side === "buy")!;
    expect(buy.tickerCode).toBe("7267");
    expect(buy.name).toBe("本田技研");
    expect(buy.yfTicker).toBe("7267.T");
    expect(buy.qty).toBe(100);
    expect(buy.price).toBeCloseTo(1602.5);
    expect(buy.amount).toBe(160250);
    expect(buy.date).toBeInstanceOf(Date);

    const sell = trades.find((t) => t.side === "sell")!;
    expect(sell.tickerCode).toBe("3436");
    expect(sell.qty).toBe(200);
  });

  it("parses fund buy trades from CSV text", () => {
    const csv = [
      "約定日,受渡日,ファンド名,取引,数量［口］,単価,受渡金額/(ポイント利用)[円]",
      '"2025/01/10","2025/01/12","eMAXIS Slim 全世界株式（オール・カントリー）","買付","50,000","23,456","50,000"',
    ].join("\n");

    const trades = parseTrades(csv);

    expect(trades).toHaveLength(1);
    expect(trades[0].name).toContain("オール・カントリー");
    expect(trades[0].qty).toBe(50000);
    expect(trades[0].amount).toBe(50000);
    // Fund trades have empty yfTicker (resolved later)
    expect(trades[0].yfTicker).toBe("");
    // Fund trades must be flagged so the metrics layer uses ratio-based valuation
    expect(trades[0].isFund).toBe(true);
  });

  it("parses US stock trades from CSV text — amounts in JPY using trade-time FX rate", () => {
    // Header matches the Rakuten tradehistory(US)_*.csv format exactly.
    const csv = [
      "約定日,受渡日,ティッカー,銘柄名,口座,取引区分,売買区分,信用区分,弁済期限,決済通貨,数量［株］,単価［USドル］,約定代金［USドル］,為替レート,手数料［USドル］,税金［USドル］,受渡金額［USドル］,受渡金額［円］",
      '"2025/06/15","2025/06/17","AAPL","Apple Inc","特定","現物","買付","-","-","USD","10","180.00","1,800.00","150.00","0.00","0.00","1,800.00","270,000"',
      '"2025/09/01","2025/09/03","AAPL","Apple Inc","特定","現物","売付","-","-","USD","5","200.00","1,000.00","152.00","0.00","0.00","1,000.00","152,000"',
    ].join("\n");

    const trades = parseTrades(csv);

    expect(trades).toHaveLength(2);

    const buy = trades.find((t) => t.side === "buy")!;
    expect(buy.tickerCode).toBe("AAPL");
    expect(buy.yfTicker).toBe("AAPL");
    expect(buy.name).toBe("Apple Inc");
    expect(buy.qty).toBe(10);
    // price should be USD unit price × fxRate → 180 × 150 = 27,000 JPY
    expect(buy.price).toBeCloseTo(27000);
    // amount should be the raw 受渡金額[円] — NOT divided by fxRate
    expect(buy.amount).toBe(270000);

    const sell = trades.find((t) => t.side === "sell")!;
    expect(sell.qty).toBe(5);
    // 200 USD × 152 rate = 30,400 JPY per share
    expect(sell.price).toBeCloseTo(30400);
    // 受渡金額[円] = 152,000 JPY — taken directly
    expect(sell.amount).toBe(152000);
  });

  it("throws on unsupported CSV format", () => {
    const csv = "Name,Value\nFoo,123\n";
    expect(() => parseTrades(csv)).toThrow("Unsupported CSV format");
  });

  it("returns empty array when no buy or sell trades found", () => {
    const csv = [
      "約定日,受渡日,銘柄コード,銘柄名,市場名称,口座区分,取引区分,売買区分,信用区分,弁済期限,数量［株］,単価［円］,手数料［円］,税金等［円］,諸費用［円］,税区分,受渡金額［円］",
      '"2025/07/01","2025/07/03","3436","ＳＵＭＣＯ","東証","特定","現物","振替","-","-","200","1,400","0","0","0","-","280,000"',
    ].join("\n");

    const trades = parseTrades(csv);
    expect(trades).toHaveLength(0);
  });
});

describe("resolveFundTicker", () => {
  it("maps known fund names to proxy tickers", () => {
    const result = resolveFundTicker("eMAXIS Slim 全世界株式（オール・カントリー）");
    expect(result).not.toBeNull();
    expect(result!.proxyTicker).toBe("ACWI");
    expect(result!.shortName).toBe("eMAXIS ACWI");
  });

  it("returns null for unknown fund names", () => {
    const result = resolveFundTicker("Unknown Fund XYZ");
    expect(result).toBeNull();
  });
});

describe("decodeFile", () => {
  it("decodes UTF-8 buffer to string", () => {
    const text = "Hello, World!";
    const encoder = new TextEncoder();
    const buffer = encoder.encode(text).buffer as ArrayBuffer;

    const decoded = decodeFile(buffer);
    expect(decoded).toContain("Hello, World!");
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    date: new Date("2025-06-15"),
    tickerCode: "7267",
    name: "Honda",
    yfTicker: "7267.T",
    qty: 100,
    price: 1602.5,
    amount: 160250,
    side: "buy",
    ...overrides,
  };
}

describe("deduplicateTrades", () => {
  it("returns the same trades when there are no duplicates", () => {
    const trades: Trade[] = [
      makeTrade({ tickerCode: "7267", amount: 160250 }),
      makeTrade({ tickerCode: "3436", yfTicker: "3436.T", amount: 280000 }),
    ];
    expect(deduplicateTrades(trades)).toHaveLength(2);
  });

  it("removes exact duplicates (same file uploaded twice)", () => {
    const trade = makeTrade();
    const result = deduplicateTrades([trade, trade, trade]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(trade); // first-seen is kept
  });

  it("removes duplicates from overlapping date-range exports of the same type", () => {
    // Simulates two JP exports where the middle month overlaps
    const shared = makeTrade({ date: new Date("2025-03-01"), amount: 160250 });
    const earlierOnly = makeTrade({ date: new Date("2025-01-15"), amount: 50000 });
    const laterOnly = makeTrade({ date: new Date("2025-05-20"), amount: 70000 });

    const file1Trades = [earlierOnly, shared];
    const file2Trades = [shared, laterOnly]; // shared row appears in both
    const merged = [...file1Trades, ...file2Trades];

    const result = deduplicateTrades(merged);
    expect(result).toHaveLength(3); // earlierOnly + shared + laterOnly
  });

  it("does not deduplicate trades that differ only in amount (legitimate same-day repeat buy)", () => {
    // Same stock, same day, same price & qty but different settlement amount (different fees)
    const trade1 = makeTrade({ amount: 160250 });
    const trade2 = makeTrade({ amount: 160300 }); // slightly higher fees
    expect(deduplicateTrades([trade1, trade2])).toHaveLength(2);
  });

  it("preserves trades across JP, US, and fund types without false-positive dedup", () => {
    const jpTrade = makeTrade({ tickerCode: "7267", yfTicker: "7267.T", amount: 160250 });
    // US trade: tickerCode is an alpha ticker, amount is in USD
    const usTrade = makeTrade({ tickerCode: "AAPL", yfTicker: "AAPL", amount: 1500 });
    // Fund trade: tickerCode is the full Japanese fund name
    const fundTrade = makeTrade({
      tickerCode: "eMAXIS Slim 全世界株式（オール・カントリー）",
      yfTicker: "",
      qty: 50000,
      price: 23456,
      amount: 50000,
    });

    const result = deduplicateTrades([jpTrade, usTrade, fundTrade]);
    expect(result).toHaveLength(3);
  });

  it("preserves insertion order, keeping first occurrence of each duplicate", () => {
    const first = makeTrade({ amount: 160250 });
    const duplicate = makeTrade({ amount: 160250 });
    const other = makeTrade({ tickerCode: "3436", yfTicker: "3436.T", amount: 280000 });

    const result = deduplicateTrades([first, duplicate, other]);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(first);
    expect(result[1]).toBe(other);
  });
});

// ── DAB bank parser ────────────────────────────────────────────────────────────

/** Minimal two-row DAB bank header + data rows helper. */
function dabCsv(...dataRows: string[]): string {
  const sectionHeader =
    "Depot;Abrechnungskonto;Auftrag;Auftrag;Auftrag;Auftrag;Auftrag;Auftrag;Auftrag;Auftrag;Auftrag;Auftrag;Auftrag;Auftrag;Auftrag;Ausführung;Ausführung;Ausführung;Ausführung;Ausführung;";
  const columnHeader =
    "Depot;Abrechnungskonto;Orderart;Aufgabedatum;Ordernummer;Stück/Nominal;Bezeichnung;ISIN;WKN;Handelsplatz;Ausführungsart;Gültig bis;Limit;Stop;Währung;Status;Kurs;Währung;Betrag;Datum / Zeit;";
  return [sectionHeader, columnHeader, ...dataRows].join("\n");
}

describe("resolveDABTicker", () => {
  it("maps known ISINs to Yahoo Finance tickers", () => {
    expect(resolveDABTicker("DE0007030009")).toBe("RHM.DE");
    expect(resolveDABTicker("US5949181045")).toBe("MSFT");
    expect(resolveDABTicker("JP3900000005")).toBe("7011.T");
    expect(resolveDABTicker("IE00BYPLS672")).toBe("ISPY.L");
  });

  it("returns null for unknown ISINs", () => {
    expect(resolveDABTicker("XX0000000000")).toBeNull();
    expect(resolveDABTicker("")).toBeNull();
  });

  it("trims surrounding whitespace before lookup", () => {
    expect(resolveDABTicker("  DE0007664039  ")).toBe("VOW3.DE");
  });
});

describe("parseDABTrades", () => {
  it("parses a Kauf (buy) row correctly", () => {
    const row =
      "005437959009;5437959009;Kauf;14.08.2024, 00:00:00;392187540;200 Stück;INTEL CORP.       DL-,001;US4581401001;855681;Tradegate;Limit;14.08.2024, 00:00:00;18,60;;EUR;Abgerechnet;18,60;EUR;3.729,00;14.08.2024, 14:33:43;";
    const trades = parseDABTrades(dabCsv(row));

    expect(trades).toHaveLength(1);
    const t = trades[0];
    expect(t.side).toBe("buy");
    expect(t.yfTicker).toBe("INTC");
    expect(t.tickerCode).toBe("US4581401001");
    expect(t.name).toBe("INTEL CORP.       DL-,001");
    expect(t.qty).toBe(200);
    expect(t.amount).toBeCloseTo(3729);
    expect(t.price).toBeCloseTo(18.645); // 3729 / 200
    expect(t.currency).toBe("EUR");
    expect(t.date).toBeInstanceOf(Date);
    expect(t.date.getFullYear()).toBe(2024);
    expect(t.date.getMonth()).toBe(7); // August = 7 (0-indexed)
    expect(t.date.getDate()).toBe(14);
  });

  it("parses a Verkauf (sell) row and stores amount as positive", () => {
    const row =
      "005437959009;5437959009;Verkauf;29.05.2026, 00:00:00;403289002;15 Stück;VOLKSWAGEN AG VZO O.N.;DE0007664039;766403;Tradegate;Bestens;30.06.2026, 00:00:00;;;EUR;Abgerechnet;92,84;EUR;-1.383,60;29.05.2026, 14:05:44;";
    const trades = parseDABTrades(dabCsv(row));

    expect(trades).toHaveLength(1);
    const t = trades[0];
    expect(t.side).toBe("sell");
    expect(t.yfTicker).toBe("VOW3.DE");
    expect(t.qty).toBe(15);
    // Betrag is -1383.60 in CSV; stored as positive abs value
    expect(t.amount).toBeCloseTo(1383.6);
    expect(t.price).toBeCloseTo(1383.6 / 15);
    expect(t.currency).toBe("EUR");
  });

  it("skips Ausschüttung (dividend) rows", () => {
    const row =
      "005437959009;5437959009;Ausschüttung;13.05.2026, 00:00:00;;22 Stück;RHEINMETALL AG;DE0007030009;703000;;;;;;EUR;Abgerechnet;11,50;EUR;-186,28;;";
    const trades = parseDABTrades(dabCsv(row));
    expect(trades).toHaveLength(0);
  });

  it("treats Einbuchung with Betrag > 0 as a buy", () => {
    const row =
      "005437959009;;Einbuchung;24.06.2022, 00:00:00;364263698;65 Stück;MICROSOFT    DL-,00000625;US5949181045;870747;;;;;;EUR;Abgerechnet;253,60;EUR;16.484,00;24.06.2022, 00:00:00;";
    const trades = parseDABTrades(dabCsv(row));

    expect(trades).toHaveLength(1);
    expect(trades[0].side).toBe("buy");
    expect(trades[0].yfTicker).toBe("MSFT");
    expect(trades[0].qty).toBe(65);
    expect(trades[0].amount).toBeCloseTo(16484);
  });

  it("includes zero-cost Einbuchung as buy (stock split / free shares)", () => {
    // Tesla 3:1 split on 25.08.2022: DAB books 100 extra shares at €0.
    // These must be recorded as a buy so the held qty stays correct.
    const row =
      "005437959009;;Einbuchung;28.03.2026, 01:15:24;402163661;200 Stück;KAWASAKI HEAVY IND.;JP3224200000;858920;;;;;;EUR;Abgerechnet;0,00;EUR;0,00;30.03.2026, 00:00:00;";
    const trades = parseDABTrades(dabCsv(row));
    expect(trades).toHaveLength(1);
    expect(trades[0].side).toBe("buy");
    expect(trades[0].qty).toBeCloseTo(200);
    expect(trades[0].amount).toBe(0);
  });

  it("includes zero-proceeds Verkauf as sell (worthless stock disposal)", () => {
    // Final sale of SPCE shares at €0 — must be tracked to close the holding round.
    const row =
      "005437959009;5437959009;Verkauf;29.05.2026, 00:00:00;403288992;2 Stück;VIRGIN GAL.HLDGS NEW O.N.;US92766K4031;A40EFX;Tradegate Wertpapierhandelsbk;Bestens;29.05.2026, 00:00:00;;;EUR;Abgerechnet;4,20;EUR;0,00;29.05.2026, 14:03:33;";
    const trades = parseDABTrades(dabCsv(row));
    expect(trades).toHaveLength(1);
    expect(trades[0].side).toBe("sell");
    expect(trades[0].qty).toBeCloseTo(2);
    expect(trades[0].amount).toBe(0);
  });

  it("parses Ausbuchung rows as sell", () => {
    const row =
      "005437959009;;Ausbuchung;03.07.2024, 00:00:00;391594313;2,1 Stück;VIRGIN GAL.HLDGS NEW O.N.;US92766K4031;A40EFX;;;;;;USD;Abgerechnet;129,60632;USD;-252,96;03.07.2024, 00:00:00;";
    const trades = parseDABTrades(dabCsv(row));
    expect(trades).toHaveLength(1);
    expect(trades[0].side).toBe("sell");
    expect(trades[0].qty).toBeCloseTo(2.1);
    expect(trades[0].yfTicker).toBe("SPCE");
  });

  it("Kauf → Ausbuchung → Einbuchung sequence produces buy/sell/buy (no share-count doubling)", () => {
    // Real-world SPCE currency-rebook: original buy, then DAB rebooks the position
    // (Ausbuchung closes the old USD-denominated lot; Einbuchung opens a new EUR lot)
    const kaufRow =
      "005437959009;5437959009;Kauf;01.07.2024, 00:00:00;391594310;2,1 Stück;VIRGIN GAL.HLDGS NEW O.N.;US92766K4031;A40EFX;Tradegate;Limit;01.07.2024, 00:00:00;120,00;;EUR;Abgerechnet;120,00;EUR;252,00;01.07.2024, 10:00:00;";
    const ausbuchungRow =
      "005437959009;;Ausbuchung;03.07.2024, 00:00:00;391594313;2,1 Stück;VIRGIN GAL.HLDGS NEW O.N.;US92766K4031;A40EFX;;;;;;USD;Abgerechnet;129,60632;USD;-252,96;03.07.2024, 00:00:00;";
    const einbuchungRow =
      "005437959009;;Einbuchung;03.07.2024, 00:00:00;391594315;2,1 Stück;VIRGIN GAL.HLDGS NEW O.N.;US92766K4031;A40EFX;;;;;;EUR;Abgerechnet;129,61;EUR;272,18;03.07.2024, 00:00:00;";
    const trades = parseDABTrades(dabCsv(kaufRow, ausbuchungRow, einbuchungRow));

    // 3 rows → 3 trades (buy + sell + buy), not collapsed to 2 buys
    expect(trades).toHaveLength(3);
    const sides = trades.map((t) => t.side);
    expect(sides).toEqual(["buy", "sell", "buy"]);

    // All three reference the same ticker with qty 2.1
    trades.forEach((t) => {
      expect(t.yfTicker).toBe("SPCE");
      expect(t.qty).toBeCloseTo(2.1);
    });
  });

  it("skips rows with an unmapped ISIN", () => {
    const row =
      "005437959009;5437959009;Kauf;10.03.2025, 00:00:00;111111111;71 Stück;DWS ARTIFIC.INTELLIGEN.ND;DE0008474149;847414;Fondsgesellschaft;Bestens;12.03.2025, 00:00:00;;;EUR;Abgerechnet;503,42;EUR;35.733,82;20.04.2026, 00:00:00;";
    const trades = parseDABTrades(dabCsv(row));
    expect(trades).toHaveLength(0);
  });

  it("falls back to Aufgabedatum when execution date is missing", () => {
    // Last two columns (Datum/Zeit) are empty; date comes from Aufgabedatum (col 3)
    const row =
      "005437959009;;Kauf;12.03.2025, 00:00:00;395390114;450 Stück;DAIICHI SANKYO CO. LTD;JP3475350009;A0F57T;Tradegate;Billigst;12.03.2025, 00:00:00;;;EUR;Teilausführung;21,94;EUR;9.882,00;;";
    const trades = parseDABTrades(dabCsv(row));
    expect(trades).toHaveLength(1);
    expect(trades[0].date.getFullYear()).toBe(2025);
    expect(trades[0].date.getMonth()).toBe(2); // March = 2 (0-indexed)
  });

  it("skips rows where both date columns are empty", () => {
    const row =
      "005437959009;;Kauf;;;450 Stück;DAIICHI SANKYO CO. LTD;JP3475350009;A0F57T;Tradegate;Billigst;;;;EUR;Teilausführung;21,94;EUR;9.882,00;;";
    const trades = parseDABTrades(dabCsv(row));
    expect(trades).toHaveLength(0);
  });

  it("handles European number format with period thousands and comma decimal", () => {
    // 2.500 Stück × Betrag 50.000,00 EUR
    const row =
      "005437959009;5437959009;Kauf;28.03.2025, 00:00:00;999999999;2.500 Stück;NTT INC.;JP3735400008;873029;Tradegate;Billigst;28.03.2025, 00:00:00;;;EUR;Abgerechnet;20,00;EUR;50.000,00;28.03.2025, 14:00:00;";
    const trades = parseDABTrades(dabCsv(row));
    expect(trades).toHaveLength(1);
    expect(trades[0].qty).toBe(2500);
    expect(trades[0].amount).toBeCloseTo(50000);
    expect(trades[0].price).toBeCloseTo(20); // 50000 / 2500
  });

  it("auto-detected by parseTrades() without explicit DAB call", () => {
    const row =
      "005437959009;5437959009;Kauf;14.08.2024, 00:00:00;392187540;200 Stück;INTEL CORP.       DL-,001;US4581401001;855681;Tradegate;Limit;14.08.2024, 00:00:00;18,60;;EUR;Abgerechnet;18,60;EUR;3.729,00;14.08.2024, 14:33:43;";
    const trades = parseTrades(dabCsv(row));
    expect(trades).toHaveLength(1);
    expect(trades[0].yfTicker).toBe("INTC");
    expect(trades[0].currency).toBe("EUR");
  });

  it("deduplicates same-day same-ISIN Einbuchung rows, keeping the highest amount (currency-rebook)", () => {
    // Simulates the SPCE currency-rebook pattern: DAB emits two Einbuchung
    // rows on the same day for the same ISIN — one with the intermediate USD
    // valuation (lower EUR amount) and one with the final EUR settlement
    // (higher EUR amount).  Only the final one should survive.
    const lowerAmountRow =
      "005437959009;;Einbuchung;03.07.2024, 00:00:00;391594314;2,1 Stück;VIRGIN GAL.HLDGS NEW O.N.;US92766K4031;A40EFX;;;;;;EUR;Abgerechnet;120,00;EUR;252,00;03.07.2024, 00:00:00;";
    const higherAmountRow =
      "005437959009;;Einbuchung;03.07.2024, 00:00:00;391594315;2,1 Stück;VIRGIN GAL.HLDGS NEW O.N.;US92766K4031;A40EFX;;;;;;EUR;Abgerechnet;129,61;EUR;272,18;03.07.2024, 00:00:00;";
    const trades = parseDABTrades(dabCsv(lowerAmountRow, higherAmountRow));

    // Both rows have the same ISIN and date → deduplicated to one
    expect(trades).toHaveLength(1);
    // The higher-amount row is kept
    expect(trades[0].amount).toBeCloseTo(272.18);
  });

  it("keeps both Einbuchung rows when they are on different days (separate transfers)", () => {
    const row1 =
      "005437959009;;Einbuchung;24.06.2022, 00:00:00;364263698;65 Stück;MICROSOFT    DL-,00000625;US5949181045;870747;;;;;;EUR;Abgerechnet;253,60;EUR;16.484,00;24.06.2022, 00:00:00;";
    const row2 =
      "005437959009;;Einbuchung;25.06.2022, 00:00:00;364263699;30 Stück;MICROSOFT    DL-,00000625;US5949181045;870747;;;;;;EUR;Abgerechnet;253,60;EUR;7.608,00;25.06.2022, 00:00:00;";
    const trades = parseDABTrades(dabCsv(row1, row2));

    expect(trades).toHaveLength(2);
    const amounts = trades.map((t) => t.amount).sort((a, b) => a - b);
    expect(amounts[0]).toBeCloseTo(7608);
    expect(amounts[1]).toBeCloseTo(16484);
  });

  it("does not deduplicate same-day same-ISIN Kauf rows (legitimate double buy)", () => {
    // Two separate buy orders for MSFT on the same day — both must be kept
    const buyRow1 =
      "005437959009;5437959009;Kauf;14.08.2024, 00:00:00;392187540;100 Stück;INTEL CORP.       DL-,001;US4581401001;855681;Tradegate;Limit;14.08.2024, 00:00:00;18,60;;EUR;Abgerechnet;18,60;EUR;1.864,50;14.08.2024, 10:00:00;";
    const buyRow2 =
      "005437959009;5437959009;Kauf;14.08.2024, 00:00:00;392187541;100 Stück;INTEL CORP.       DL-,001;US4581401001;855681;Tradegate;Limit;14.08.2024, 00:00:00;18,60;;EUR;Abgerechnet;18,60;EUR;1.864,50;14.08.2024, 15:30:00;";
    const trades = parseDABTrades(dabCsv(buyRow1, buyRow2));

    expect(trades).toHaveLength(2);
  });

  it("multiple rows parsed into correct trade count", () => {
    const buyRow =
      "005437959009;5437959009;Kauf;14.08.2024, 00:00:00;392187540;200 Stück;INTEL CORP.       DL-,001;US4581401001;855681;Tradegate;Limit;14.08.2024, 00:00:00;18,60;;EUR;Abgerechnet;18,60;EUR;3.729,00;14.08.2024, 14:33:43;";
    const sellRow =
      "005437959009;5437959009;Verkauf;29.05.2026, 00:00:00;403289002;15 Stück;VOLKSWAGEN AG VZO O.N.;DE0007664039;766403;Tradegate;Bestens;30.06.2026, 00:00:00;;;EUR;Abgerechnet;92,84;EUR;-1.383,60;29.05.2026, 14:05:44;";
    const dividendRow =
      "005437959009;5437959009;Ausschüttung;13.05.2026, 00:00:00;;22 Stück;RHEINMETALL AG;DE0007030009;703000;;;;;;EUR;Abgerechnet;11,50;EUR;-186,28;;";
    const trades = parseDABTrades(dabCsv(buyRow, sellRow, dividendRow));
    // dividend skipped → 2 trades
    expect(trades).toHaveLength(2);
    expect(trades.filter((t) => t.side === "buy")).toHaveLength(1);
    expect(trades.filter((t) => t.side === "sell")).toHaveLength(1);
  });
});

// ── Format detection ───────────────────────────────────────────────────────────

describe("isDABFormat", () => {
  it("returns true for a DAB bank CSV header", () => {
    const csv = dabCsv(
      "005437959009;5437959009;Kauf;14.08.2024, 00:00:00;392187540;200 Stück;INTEL CORP.       DL-,001;US4581401001;855681;Tradegate;Limit;14.08.2024, 00:00:00;18,60;;EUR;Abgerechnet;18,60;EUR;3.729,00;14.08.2024, 14:33:43;"
    );
    expect(isDABFormat(csv)).toBe(true);
  });

  it("returns false for a Rakuten JP CSV", () => {
    const csv = [
      "約定日,受渡日,銘柄コード,銘柄名,売買区分,数量［株］,受渡金額［円］",
      '"2025/06/15","2025/06/17","7267","本田技研","買付","100","160,250"',
    ].join("\n");
    expect(isDABFormat(csv)).toBe(false);
  });

  it("returns false for an unrelated CSV", () => {
    expect(isDABFormat("Name,Value\nFoo,123\n")).toBe(false);
  });
});

describe("isRakutenFormat", () => {
  it("returns true for a Rakuten JP stocks CSV", () => {
    const csv = "約定日,受渡日,銘柄コード,銘柄名,売買区分\n";
    expect(isRakutenFormat(csv)).toBe(true);
  });

  it("returns true for a Rakuten investment trust CSV", () => {
    const csv = "約定日,受渡日,ファンド名,取引,数量［口］\n";
    expect(isRakutenFormat(csv)).toBe(true);
  });

  it("returns true for a Rakuten US stocks CSV", () => {
    const csv = "約定日,受渡日,ティッカー,銘柄名,売買区分\n";
    expect(isRakutenFormat(csv)).toBe(true);
  });

  it("returns false for a DAB bank CSV", () => {
    expect(isRakutenFormat(dabCsv(""))).toBe(false);
  });

  it("returns false for an unrelated CSV", () => {
    expect(isRakutenFormat("Name,Value\nFoo,123\n")).toBe(false);
  });
});

// ── parseRakutenTrades (named export, same behaviour as parseTrades for Rakuten) ──

describe("parseRakutenTrades", () => {
  it("parses JP stock trades identically to parseTrades", () => {
    const csv = [
      "約定日,受渡日,銘柄コード,銘柄名,市場名称,口座区分,取引区分,売買区分,信用区分,弁済期限,数量［株］,単価［円］,手数料［円］,税金等［円］,諸費用［円］,税区分,受渡金額［円］",
      '"2025/06/15","2025/06/17","7267","本田技研","東証","特定","現物","買付","-","-","100","1,602.5","0","0","0","-","160,250"',
    ].join("\n");

    const via_parseTrades   = parseTrades(csv);
    const via_parseRakuten  = parseRakutenTrades(csv);

    expect(via_parseRakuten).toHaveLength(1);
    expect(via_parseRakuten[0].tickerCode).toBe(via_parseTrades[0].tickerCode);
    expect(via_parseRakuten[0].qty).toBe(via_parseTrades[0].qty);
    expect(via_parseRakuten[0].amount).toBe(via_parseTrades[0].amount);
  });

  it("throws on unsupported CSV format", () => {
    expect(() => parseRakutenTrades("Name,Value\nFoo,123\n")).toThrow(
      "Unsupported CSV format"
    );
  });
});
