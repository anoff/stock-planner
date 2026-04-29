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
 * Parse a Rakuten trade-history CSV (JP stocks or investment trusts) into Trade objects.
 *
 * Supports two formats:
 *  - JP stocks: tradehistory(JP)_*.csv — has 銘柄コード column
 *  - Investment trusts: tradehistory(INVST)_*.csv — has ファンド名 column
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

  // Detect format: JP stocks vs investment trusts
  const isJpStocks = headers.includes("銘柄コード");
  const isFunds = headers.includes("ファンド名");

  if (!isJpStocks && !isFunds) {
    throw new Error(
      "Unsupported CSV format. Expected Rakuten trade history (JP stocks or investment trusts)."
    );
  }

  for (const row of result.data) {
    const rawSide = isJpStocks ? row["売買区分"] : row["取引"];
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
    } else {
      name = (row["ファンド名"] ?? "").trim();
      // For funds, we'll map them to proxy tickers later
      tickerCode = name;
      yfTicker = "";
    }

    const qty = parseJpNum(
      isJpStocks ? row["数量［株］"] ?? "0" : row["数量［口］"] ?? "0"
    );
    const price = parseJpNum(
      isJpStocks ? row["単価［円］"] ?? "0" : row["単価"] ?? "0"
    );
    const amount = parseJpNum(
      isJpStocks
        ? row["受渡金額［円］"] ?? "0"
        : row["受渡金額/(ポイント利用)[円]"] ?? "0"
    );

    if (qty > 0 && amount > 0) {
      trades.push({ date, tickerCode, name, yfTicker, qty, price, amount, side });
    }
  }

  return trades;
}

/**
 * Parse trade history pasted directly from the Rakuten Securities web UI.
 *
 * The web UI trade-history page can be copied as plain text (select all → copy).
 * It may appear in Japanese, in auto-translated English, or as a mix of both
 * when the user copies across two paginated views.
 *
 * Each record occupies exactly 16 non-blank, non-header lines:
 *   [0]  Execution date  YYYY/MM/DD
 *   [1]  Delivery date   YYYY/MM/DD
 *   [2]  Security name
 *   [3]  Ticker + exchange  e.g. "3093 東証"  or  "3382 TSE"
 *   [4]  Account type   (ignored)
 *   [5]  Transaction type  (ignored)
 *   [6]  Side  "買付" | "売付" | "Purchase" | …
 *   [7]  Credit classification  (ignored)
 *   [8]  Payment deadline  (ignored)
 *   [9]  Quantity  "300 株" | "200 shares"
 *  [10]  Unit price  "1,816.0"
 *  [11]  Commission  (ignored)
 *  [12]  Tax  (ignored)
 *  [13]  Various costs  (ignored)
 *  [14]  Tax classification  (ignored)
 *  [15]  Delivery amount  "544,800"
 *
 * Column-header labels (both JP and EN) are stripped before counting, so the
 * offsets stay consistent regardless of how many header rows appear.
 *
 * Duplicate rows (same date + ticker + qty + price + side) are deduplicated,
 * which handles the common case where the user copies across a JP/EN boundary
 * and the same trades appear twice.
 */
export function parsePastedTrades(text: string): Trade[] {
  const DATE_RE = /^\d{4}\/\d{2}\/\d{2}$/;
  // Ticker line: 3–4 digit code + optional letter suffix + whitespace + exchange name
  const TICKER_RE = /^(\d{3,4}[A-Z]?)\s+\S/;
  // Quantity line: digits (with commas) followed by 株 or shares
  const QTY_RE = /^([\d,]+)\s*(?:株|shares)$/i;

  // Column-header labels that appear in the pasted text but are NOT data values.
  // Lowercased so we can compare after line.toLowerCase().
  const SKIP_TOKENS = new Set([
    // EN column headers
    "ate of execution", "date of execution", "delivery date", "brand",
    "account", "transaction", "buying and selling", "credit classification",
    "deadline for payment", "quantity", "unit price ［yen］", "commission ［yen］",
    "tax ［yen］", "various costs ［yen］", "tax classification",
    "delivery amount ［yen］", "details",
    // JP column headers
    "約定日", "受渡日", "銘柄", "口座", "取引", "売買", "信用区分", "弁済期限",
    "数量", "単価［円］", "手数料［円］", "税金［円］", "諸費用［円］", "税区分",
    "受渡金額［円］", "詳細",
  ]);

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "" && !SKIP_TOKENS.has(l.toLowerCase()));

  const trades: Trade[] = [];
  // Deduplicate by (date, ticker, qty, price, side) to handle JP/EN boundary overlap
  const seen = new Set<string>();

  let i = 0;
  while (i < lines.length - 15) {
    // Anchor: two consecutive YYYY/MM/DD lines mark the start of a record
    if (DATE_RE.test(lines[i]) && DATE_RE.test(lines[i + 1])) {
      // Sanity check: line i+3 should look like a ticker line
      const tickerMatch = TICKER_RE.exec(lines[i + 3]);
      if (tickerMatch) {
        const execDate = new Date(lines[i].replace(/\//g, "-"));
        const name = lines[i + 2];
        const tickerCode = tickerMatch[1];
        const sideRaw = lines[i + 6];
        const qtyLine = lines[i + 9];
        const priceStr = lines[i + 10];
        const amountStr = lines[i + 15];

        const isBuy = sideRaw === "買付" || sideRaw.toLowerCase() === "purchase";
        const isSell = sideRaw === "売付" || /^(sell|sale)$/i.test(sideRaw.trim());

        if (isBuy || isSell) {
          const qtyMatch = QTY_RE.exec(qtyLine);
          if (qtyMatch) {
            const qty = parseFloat(qtyMatch[1].replace(/,/g, ""));
            const price = parseJpNum(priceStr);
            const amount = parseJpNum(amountStr);

            if (qty > 0 && amount > 0 && !isNaN(price)) {
              const side: "buy" | "sell" = isBuy ? "buy" : "sell";
              const yfTicker = `${tickerCode}.T`;
              const dedupeKey = `${lines[i]}|${tickerCode}|${qty}|${price}|${side}`;
              if (!seen.has(dedupeKey)) {
                seen.add(dedupeKey);
                trades.push({ date: execDate, tickerCode, name, yfTicker, qty, price, amount, side });
              }
            }
          }
        }
        i += 16;
        continue;
      }
    }
    i++;
  }

  if (trades.length === 0) {
    throw new Error(
      "No trades found. Make sure you copied the full trade history table from the Rakuten Securities web UI."
    );
  }

  return trades;
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
