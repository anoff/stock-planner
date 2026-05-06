import { describe, it, expect } from "vitest";
import { parseTrades, resolveFundTicker, decodeFile } from "../utils/csv";

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

describe("decodeFile", () => {
  it("decodes UTF-8 buffer to string", () => {
    const text = "Hello, World!";
    const encoder = new TextEncoder();
    const buffer = encoder.encode(text).buffer as ArrayBuffer;

    const decoded = decodeFile(buffer);
    expect(decoded).toContain("Hello, World!");
  });
});
