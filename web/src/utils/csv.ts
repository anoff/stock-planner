import Encoding from "encoding-japanese";
import Papa from "papaparse";
import type { Trade } from "./types";

/**
 * Decode a Shift-JIS (or UTF-8) encoded file to a UTF-8 string.
 */
export function decodeFile(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const detected = Encoding.detect(bytes);
  if (detected === "SJIS" || detected === "UTF8") {
    const unicodeArray = Encoding.convert(bytes, {
      to: "UNICODE",
      from: detected,
    });
    return Encoding.codeToString(unicodeArray);
  }
  return new TextDecoder("utf-8").decode(buffer);
}

/**
 * Parse a Japanese-formatted number string (with commas, full-width chars).
 */
function parseJpNum(val: string): number {
  const s = val
    .replace(/,/g, "")
    .replace(/−/g, "-")
    .replace(/―/g, "0")
    .trim();
  if (s === "" || s === "-") return 0;
  return parseFloat(s);
}

/**
 * Find the first header that contains all of the given keyword substrings.
 * Used to locate columns whose names may vary in parenthesis style
 * (e.g. full-width 「（US$）」 vs half-width 「(US$)」).
 */
function findHeader(headers: string[], ...keywords: string[]): string | undefined {
  return headers.find((h) => keywords.every((kw) => h.includes(kw)));
}

/**
 * Look up a column value by keyword matching instead of exact header name.
 * Returns an empty string when no matching header is found.
 */
function getColByKeywords(
  row: Record<string, string>,
  headers: string[],
  ...keywords: string[]
): string {
  const header = findHeader(headers, ...keywords);
  return header !== undefined ? (row[header] ?? "") : "";
}

/**
 * Parse a Rakuten trade-history CSV into Trade objects.
 *
 * Supports three formats:
 *  - JP stocks:         tradehistory(JP)_*.csv    — has 銘柄コード column
 *  - Investment trusts: tradehistory(INVST)_*.csv — has ファンド名 column
 *  - US stocks:         tradehistory(US)_*.csv    — has ティッカー column
 *
 * For US stocks the Yahoo Finance ticker is used as-is (no exchange suffix).
 * Price and cost-basis amounts are stored in JPY (unit price multiplied by
 * the trade-time 為替レート; settlement taken directly from 受渡金額[円]) so
 * they are consistent with JP stocks and investment trusts.  Current market
 * value is computed in metrics.ts by multiplying qty × USD price × live
 * USDJPY=X rate fetched from Yahoo Finance.
 *
 * Returns all trades (both buy and sell) with the `side` field set accordingly.
 */
export function parseTrades(csvText: string): Trade[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`CSV parse error: ${result.errors[0].message}`);
  }

  const trades: Trade[] = [];
  const headers = result.meta.fields ?? [];

  // Detect format: JP stocks vs investment trusts vs US stocks
  const isJpStocks = headers.includes("銘柄コード");
  const isFunds = headers.includes("ファンド名");
  const isUsStocks = headers.includes("ティッカー");

  if (!isJpStocks && !isFunds && !isUsStocks) {
    throw new Error(
      "Unsupported CSV format. Expected Rakuten trade history (JP stocks, US stocks, or investment trusts)."
    );
  }

  for (const row of result.data) {
    // US stocks and JP stocks both use 売買区分; investment trusts use 取引
    const rawSide = isFunds ? row["取引"] : row["売買区分"];
    const isBuy = rawSide === "買付";
    const isSell = rawSide === "売付";
    if (!isBuy && !isSell) continue;
    const side: "buy" | "sell" = isBuy ? "buy" : "sell";

    const dateStr = row["約定日"];
    if (!dateStr) continue;
    const date = new Date(dateStr.replace(/\//g, "-"));

    let tickerCode: string;
    let name: string;
    let yfTicker: string;

    if (isJpStocks) {
      tickerCode = (row["銘柄コード"] ?? "").trim();
      name = (row["銘柄名"] ?? "").trim();
      yfTicker = `${tickerCode}.T`;
    } else if (isUsStocks) {
      tickerCode = (row["ティッカー"] ?? "").trim();
      name = (row["銘柄名"] ?? "").trim();
      // US tickers are used directly on Yahoo Finance (no exchange suffix)
      yfTicker = tickerCode;
    } else {
      name = (row["ファンド名"] ?? "").trim();
      // For funds, we'll map them to proxy tickers later
      tickerCode = name;
      yfTicker = "";
    }

    let qty: number;
    let price: number;
    let amount: number;

    if (isJpStocks) {
      qty = parseJpNum(row["数量［株］"] ?? "0");
      price = parseJpNum(row["単価［円］"] ?? "0");
      amount = parseJpNum(row["受渡金額［円］"] ?? "0");
    } else if (isUsStocks) {
      // Quantity column has no unit suffix for US stocks; match by keyword
      const qtyHeader = findHeader(headers, "数量") ?? "数量";
      qty = parseJpNum(row[qtyHeader] ?? "0");

      // Exchange rate (為替レート) recorded at the time of the trade.
      const fxRate = parseJpNum(
        getColByKeywords(row, headers, "為替") || "1"
      );

      // Unit price: convert from USD to JPY using the trade-time exchange rate
      // so all price and amount fields are denominated in JPY, consistent with
      // JP stocks and investment trusts.  Current value is then computed as
      // qty × currentPrice_USD × currentUsdJpy (in metrics.ts).
      price = parseJpNum(getColByKeywords(row, headers, "単価", "US") || "0") * (fxRate > 0 ? fxRate : 1);

      // Settlement amount in JPY — taken directly from 受渡金額[円] (which
      // already includes fees and taxes) so the cost basis is in JPY and can
      // be compared correctly with the JPY-converted current value.
      amount = parseJpNum(
        getColByKeywords(row, headers, "受渡金額", "円") || "0"
      );
    } else {
      qty = parseJpNum(row["数量［口］"] ?? "0");
      price = parseJpNum(row["単価"] ?? "0");
      amount = parseJpNum(row["受渡金額/(ポイント利用)[円]"] ?? "0");
    }

    if (qty > 0 && amount > 0) {
      trades.push({
        date, tickerCode, name, yfTicker, qty, price, amount, side,
        ...(isFunds ? { isFund: true } : {}),
      });
    }
  }

  return trades;
}

/**
 * Deduplicate a merged Trade array using a composite key:
 *   date + tickerCode + side + qty + price + amount
 *
 * The settlement amount (which includes brokerage fees) is included so that
 * two legitimate same-day same-stock same-price transactions with slightly
 * different fee totals are never incorrectly collapsed.  Only genuinely
 * identical rows — e.g. the same CSV uploaded twice, or overlapping
 * date-range exports — will be removed.
 *
 * First-seen order is preserved; later duplicates are dropped.
 */
export function deduplicateTrades(trades: Trade[]): Trade[] {
  const seen = new Set<string>();
  const result: Trade[] = [];
  for (const t of trades) {
    const key = `${t.date.toISOString().slice(0, 10)}-${t.tickerCode}-${t.side}-${t.qty}-${t.price}-${t.amount}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(t);
    }
  }
  return result;
}

/** Map fund trades to proxy tickers based on name substrings. */
const FUND_MAPPINGS: { nameContains: string; shortName: string; proxyTicker: string }[] = [
  { nameContains: "オール・カントリー", shortName: "eMAXIS ACWI", proxyTicker: "ACWI" },
  { nameContains: "純金ファンド", shortName: "Gold Fund", proxyTicker: "GLD" },
  { nameContains: "高配当株式・米国", shortName: "US High Div", proxyTicker: "SCHD" },
  { nameContains: "欧州株式インデックス", shortName: "EU Equity", proxyTicker: "IEUR" },
];

/** Resolve fund proxy ticker from name. Returns null if unmapped. */
export function resolveFundTicker(
  name: string
): { shortName: string; proxyTicker: string } | null {
  for (const mapping of FUND_MAPPINGS) {
    if (name.includes(mapping.nameContains)) {
      return { shortName: mapping.shortName, proxyTicker: mapping.proxyTicker };
    }
  }
  return null;
}
