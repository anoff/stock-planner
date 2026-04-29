import { describe, it, expect } from "vitest";
import { parseTrades, parsePastedTrades, resolveFundTicker, decodeFile } from "../utils/csv";

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

// ── Helpers to build paste text ────────────────────────────────────────────

/** Build a single paste record (16 lines) in Japanese format. */
function jpRecord({
  execDate = "2026/02/25",
  deliveryDate = "2026/02/27",
  name = "テスト株式会社",
  tickerLine = "1234 東証",
  account = "特定",
  txnType = "現物",
  side = "買付",
  qty = "100 株",
  price = "1,000.0",
  taxClass = "-",
  amount = "100,000",
}: Partial<{
  execDate: string; deliveryDate: string; name: string; tickerLine: string;
  account: string; txnType: string; side: string; qty: string;
  price: string; taxClass: string; amount: string;
}> = {}): string {
  return [
    execDate, deliveryDate, name, tickerLine,
    account, txnType, side,
    "-", "-",       // credit class, deadline
    qty, price,
    "-", "-", "-",  // commission, tax, costs
    taxClass,
    amount,
  ].join("\n");
}

/** Build a single paste record in English (auto-translated) format. */
function enRecord({
  execDate = "2025/03/14",
  deliveryDate = "2025/03/18",
  name = "Test Corp",
  tickerLine = "1234 TSE",
  account = "Identification",
  txnType = "In kind",
  side = "Purchase",
  qty = "100 shares",
  price = "1,000.0",
  taxClass = "-",
  amount = "100,000",
}: Partial<{
  execDate: string; deliveryDate: string; name: string; tickerLine: string;
  account: string; txnType: string; side: string; qty: string;
  price: string; taxClass: string; amount: string;
}> = {}): string {
  return [
    execDate, deliveryDate, name, tickerLine,
    account, txnType, side,
    "-", "-",
    qty, price,
    "-", "-", "-",
    taxClass,
    amount,
  ].join("\n");
}

/** Wrap records in a realistic paste with EN headers. */
function withEnHeaders(records: string): string {
  return [
    "ate of execution",
    "Delivery date",
    "Brand",
    "account",
    "transaction",
    "Buying and selling",
    "Credit classification",
    "Deadline for payment",
    "Quantity",
    "Unit price ［yen］",
    "Commission ［yen］",
    "Tax ［yen］",
    "Various costs ［yen］",
    "Tax classification",
    "Delivery amount ［yen］",
    "details",
    "",
    records,
  ].join("\n");
}

/** Wrap records in a realistic paste with JP headers. */
function withJpHeaders(records: string): string {
  return [
    "約定日", "受渡日", "銘柄", "口座", "取引", "売買",
    "信用区分", "弁済期限", "数量", "単価［円］", "手数料［円］",
    "税金［円］", "諸費用［円］", "税区分", "受渡金額［円］", "詳細",
    "",
    records,
  ].join("\n");
}

describe("parsePastedTrades", () => {
  it("parses a single JP buy record", () => {
    const text = withJpHeaders(
      jpRecord({ name: "トレジャー・ファクトリー", tickerLine: "3093 東証", qty: "300 株", price: "1,816.0", amount: "544,800" })
    );
    const trades = parsePastedTrades(text);

    expect(trades).toHaveLength(1);
    expect(trades[0].tickerCode).toBe("3093");
    expect(trades[0].yfTicker).toBe("3093.T");
    expect(trades[0].name).toBe("トレジャー・ファクトリー");
    expect(trades[0].qty).toBe(300);
    expect(trades[0].price).toBeCloseTo(1816.0);
    expect(trades[0].amount).toBe(544800);
    expect(trades[0].side).toBe("buy");
    expect(trades[0].date).toBeInstanceOf(Date);
  });

  it("parses a single EN buy record (auto-translated)", () => {
    const text = withEnHeaders(
      enRecord({ name: "Seven & i HLDGS", tickerLine: "3382 TSE", qty: "200 shares", price: "2,187.0", amount: "437,400" })
    );
    const trades = parsePastedTrades(text);

    expect(trades).toHaveLength(1);
    expect(trades[0].tickerCode).toBe("3382");
    expect(trades[0].yfTicker).toBe("3382.T");
    expect(trades[0].qty).toBe(200);
    expect(trades[0].price).toBeCloseTo(2187.0);
    expect(trades[0].amount).toBe(437400);
    expect(trades[0].side).toBe("buy");
  });

  it("parses a sell trade (JP 売付)", () => {
    const text = withJpHeaders(
      jpRecord({ name: "本田技研", tickerLine: "7267 東証", side: "売付", qty: "1,700 株", price: "1,269.0", taxClass: "源徴あり", amount: "2,157,300" })
    );
    const trades = parsePastedTrades(text);

    expect(trades).toHaveLength(1);
    expect(trades[0].side).toBe("sell");
    expect(trades[0].qty).toBe(1700);
    expect(trades[0].amount).toBe(2157300);
  });

  it("parses multiple records in one paste (JP)", () => {
    const records = [
      jpRecord({ execDate: "2026/04/03", deliveryDate: "2026/04/07", name: "ホクト", tickerLine: "1379 東証", qty: "100 株", price: "1,940.0", amount: "194,000" }),
      "",
      jpRecord({ execDate: "2026/04/03", deliveryDate: "2026/04/07", name: "ホクト", tickerLine: "1379 東証", qty: "200 株", price: "1,939.0", amount: "387,800" }),
      "",
      jpRecord({ execDate: "2026/04/03", deliveryDate: "2026/04/07", name: "アステリア", tickerLine: "3853 東証", qty: "100 株", price: "1,533.0", amount: "153,300" }),
    ].join("\n");

    const trades = parsePastedTrades(withJpHeaders(records));

    expect(trades).toHaveLength(3);
    expect(trades.filter(t => t.tickerCode === "1379")).toHaveLength(2);
    expect(trades.filter(t => t.tickerCode === "3853")).toHaveLength(1);
  });

  it("deduplicates trades when EN and JP sections overlap", () => {
    // Simulate the same trade appearing in both EN and JP sections of the paste
    const enSection = withEnHeaders(
      enRecord({ execDate: "2026/02/25", deliveryDate: "2026/02/27", name: "Treasure Factory", tickerLine: "3093 TSE", qty: "300 shares", price: "1,817.0", amount: "545,100" })
    );
    const jpSection = withJpHeaders(
      jpRecord({ execDate: "2026/02/25", deliveryDate: "2026/02/27", name: "トレジャー・ファクトリー", tickerLine: "3093 東証", qty: "300 株", price: "1,817.0", amount: "545,100" })
    );
    const trades = parsePastedTrades(enSection + "\n" + jpSection);

    // Should deduplicate to one trade
    expect(trades).toHaveLength(1);
    expect(trades[0].tickerCode).toBe("3093");
    expect(trades[0].qty).toBe(300);
  });

  it("parses ticker with letter suffix (e.g. 278A)", () => {
    const text = withEnHeaders(
      enRecord({ name: "TERRADRONE", tickerLine: "278A Tokyo Stock Exchange", qty: "300 shares", price: "2,636.0", amount: "790,800" })
    );
    const trades = parsePastedTrades(text);

    expect(trades).toHaveLength(1);
    expect(trades[0].tickerCode).toBe("278A");
    expect(trades[0].yfTicker).toBe("278A.T");
  });

  it("parses trades split across multiple exchanges (same day)", () => {
    // SUMCO bought across ToSTNeT, JAX — three separate records
    const records = [
      jpRecord({ execDate: "2025/12/24", deliveryDate: "2025/12/26", name: "ＳＵＭＣＯ", tickerLine: "3436 ToSTNeT", qty: "2,200 株", price: "1,400.4", amount: "3,080,880" }),
      "",
      jpRecord({ execDate: "2025/12/24", deliveryDate: "2025/12/26", name: "ＳＵＭＣＯ", tickerLine: "3436 JAX", qty: "200 株", price: "1,400.2", amount: "280,040" }),
      "",
      jpRecord({ execDate: "2025/12/24", deliveryDate: "2025/12/26", name: "ＳＵＭＣＯ", tickerLine: "3436 JAX", qty: "100 株", price: "1,400.1", amount: "140,010" }),
    ].join("\n");

    const trades = parsePastedTrades(withJpHeaders(records));

    expect(trades).toHaveLength(3);
    expect(trades.every(t => t.tickerCode === "3436")).toBe(true);
    expect(trades.reduce((s, t) => s + t.qty, 0)).toBe(2500);
  });

  it("parses NISA account trades", () => {
    const text = withEnHeaders(
      enRecord({ name: "Tokyo Electron", tickerLine: "8035 Off-market", account: "NISA Growth Investment Facility", txnType: "In kind (less than unit)", qty: "50 shares", price: "22,410.0", amount: "1,120,500" })
    );
    const trades = parsePastedTrades(text);

    expect(trades).toHaveLength(1);
    expect(trades[0].tickerCode).toBe("8035");
    expect(trades[0].qty).toBe(50);
    expect(trades[0].price).toBeCloseTo(22410);
  });

  it("throws when no trades found", () => {
    expect(() => parsePastedTrades("some random text\nwith no trade data")).toThrow(
      "No trades found"
    );
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
