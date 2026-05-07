import { describe, it, expect } from "vitest";
import { parseTrades, resolveFundTicker, decodeFile, deduplicateTrades } from "../utils/csv";
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
