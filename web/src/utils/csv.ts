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
 * Comma is the thousands separator; period is the decimal point.
 * e.g. "160,250" → 160250, "1,602.5" → 1602.5
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
 * Parse a European-formatted number string.
 * Period is the thousands separator; comma is the decimal point.
 * e.g. "1.383,60" → 1383.60, "2.500" → 2500, "92,84" → 92.84
 */
function parseEuroNum(val: string): number {
  const s = val
    .replace(/\./g, "")   // remove thousands separators
    .replace(/,/g, ".")   // decimal comma → decimal point
    .trim();
  if (s === "" || s === "-") return 0;
  return parseFloat(s);
}

/**
 * Parse a DAB bank date string "DD.MM.YYYY, HH:MM:SS" into a Date.
 * Returns null when the string is empty or does not match the expected format.
 */
function parseDABDate(val: string): Date | null {
  if (!val || val.trim() === "") return null;
  const m = val.match(/(\d{2})\.(\d{2})\.(\d{4})(?:,\s*(\d{2}:\d{2}:\d{2}))?/);
  if (!m) return null;
  const [, day, month, year, time] = m;
  return new Date(`${year}-${month}-${day}T${time ?? "00:00:00"}`);
}

/**
 * Parse a DAB bank quantity string like "15 Stück", "2.500 Stück", "2,1 Stück".
 * Strips the " Stück" suffix and delegates to parseEuroNum.
 */
function parseDABQty(val: string): number {
  return parseEuroNum(val.replace(/\s*Stück\s*/g, "").trim());
}

/**
 * Return true when the CSV text looks like a DAB bank order history export.
 * DAB exports have a unique two-row header structure where the second row
 * contains "Orderart" as a column name.
 */
export function isDABFormat(csvText: string): boolean {
  const firstLines = csvText.split("\n").slice(0, 3).join("\n");
  return firstLines.includes("Orderart") || firstLines.includes("Abrechnungskonto");
}

/**
 * Return true when the CSV text looks like a Rakuten Securities trade history
 * export (any of the three sub-formats: JP stocks, US stocks, or investment
 * trusts).  Each format has a distinct Japanese column header in the first row:
 *   - JP stocks:         銘柄コード
 *   - Investment trusts: ファンド名
 *   - US stocks:         ティッカー
 */
export function isRakutenFormat(csvText: string): boolean {
  const firstLine = csvText.split("\n")[0] ?? "";
  return (
    firstLine.includes("銘柄コード") ||
    firstLine.includes("ファンド名") ||
    firstLine.includes("ティッカー")
  );
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

// ── DAB bank ISIN → Yahoo Finance ticker mapping ─────────────────────────────

/**
 * Static mapping from ISIN to Yahoo Finance ticker for DAB bank portfolios.
 * Add entries here for any securities not yet covered.
 * Securities without a mapping are silently skipped during parsing.
 */
export const DAB_ISIN_MAPPINGS: Record<string, string> = {
  // European stocks (EUR-priced on Yahoo Finance)
  "DE0007664039": "VOW3.DE",  // Volkswagen AG Vorzüge
  "DE0007030009": "RHM.DE",   // Rheinmetall AG
  "DE0005313704": "AFX.DE",   // Carl Zeiss Meditec AG
  "NL0000235190": "AIR.DE",   // Airbus SE
  // US stocks (USD-priced on Yahoo Finance)
  "US65339F1012": "NEE",      // NextEra Energy Inc
  "US5949181045": "MSFT",     // Microsoft Corp
  "US02079K3059": "GOOGL",    // Alphabet Inc Class A
  "US4581401001": "INTC",     // Intel Corp
  "US64110L1061": "NFLX",     // Netflix Inc
  "US92766K4031": "SPCE",     // Virgin Galactic Holdings New
  "US88160R1014": "TSLA",     // Tesla Inc
  "US0231351067": "AMZN",     // Amazon.com Inc
  "US0970231058": "BA",       // Boeing Co
  // Japanese stocks (JPY-priced on Yahoo Finance)
  "JP3224200000": "7012.T",   // Kawasaki Heavy Industries
  "JP3900000005": "7011.T",   // Mitsubishi Heavy Industries
  "JP3814800003": "7270.T",   // Subaru Corp
  "JP3475350009": "4568.T",   // Daiichi Sankyo Co
  "JP3735400008": "9432.T",   // NTT Inc
  "JP3657400002": "7731.T",   // Nikon Corp
  "JP3783600004": "9020.T",   // East Japan Railway
  "JP3429800000": "9202.T",   // ANA Holdings Inc
  "JP3242800005": "7751.T",   // Canon Inc
  // ETFs
  "IE00BYPLS672": "ISPY.L",   // L&G Cyber Security UCITS ETF (LSE)
};

/**
 * Resolve a DAB bank ISIN to a Yahoo Finance ticker.
 * Returns null when the ISIN is not in the mapping table.
 */
export function resolveDABTicker(isin: string): string | null {
  return DAB_ISIN_MAPPINGS[isin.trim()] ?? null;
}

// ── DAB bank parser ───────────────────────────────────────────────────────────

/**
 * DAB bank order history CSV column indices (0-based).
 *
 * The export has two header rows:
 *   Row 0: section labels (Depot; Abrechnungskonto; Auftrag×13; Ausführung×5)
 *   Row 1: column names  (Depot; Abrechnungskonto; Orderart; Aufgabedatum; …)
 *
 * PapaParse is used with header:false to avoid the duplicate "Währung" column
 * name problem. Data rows start at index 2.
 */
const DAB_COL = {
  ORDERART:    2,   // Kauf | Verkauf | Ausschüttung | Einbuchung | Ausbuchung
  AUFGABEDATUM: 3,  // Order date "DD.MM.YYYY, HH:MM:SS" — fallback date
  QTY:         5,   // Stück/Nominal e.g. "15 Stück"
  NAME:        6,   // Bezeichnung (security name)
  ISIN:        7,   // ISIN
  BETRAG:      18,  // Amount in EUR (positive = buy, negative = sell/dividend)
  DATUM:       19,  // Execution date "DD.MM.YYYY, HH:MM:SS"
} as const;

/**
 * Parse a DAB bank order history CSV export into Trade objects.
 *
 * Transaction mapping:
 *  - Kauf          → buy
 *  - Verkauf       → sell
 *  - Einbuchung    → buy (portfolio transfer in at stated cost; zero-cost entries
 *                    such as stock splits are included with amount=0 so that the
 *                    share count remains correct)
 *  - Ausschüttung  → skipped (dividend, not a trade)
 *  - Ausbuchung    → sell (transfer out; closes the holding round so a subsequent
 *                    Einbuchung starts a fresh round at the rebook price)
 *
 * All amount and price fields are stored in EUR (the broker converts at trade
 * time).  The trade's `currency` is set to "EUR" so metrics.ts can apply the
 * correct FX conversion when computing current portfolio value.
 *
 * ISINs not present in DAB_ISIN_MAPPINGS are silently skipped; add entries to
 * DAB_ISIN_MAPPINGS to include additional securities.
 */
export function parseDABTrades(csvText: string): Trade[] {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
    delimiter: ";",
  });

  if (result.errors.length > 0 && result.data.length < 3) {
    throw new Error(`DAB CSV parse error: ${result.errors[0].message}`);
  }

  const rows = result.data;
  // Row 0: section labels, Row 1: column names, Row 2+: data
  if (rows.length < 3) return [];

  // Regular Kauf/Verkauf trades are kept as-is (multiple same-day same-ISIN
  // orders are all legitimate).  Einbuchung trades are collected separately so
  // that same-day same-ISIN duplicates from currency-rebook sequences (e.g.
  // Virgin Galactic USD→EUR conversion) can be collapsed to the single entry
  // with the highest EUR settlement amount — the authoritative one.
  const regularTrades: Trade[] = [];
  const einbuchungMap = new Map<string, Trade>(); // "YYYY-MM-DD-ISIN" → best trade

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length <= DAB_COL.BETRAG) continue;

    const orderart = row[DAB_COL.ORDERART]?.trim() ?? "";

    let side: "buy" | "sell";
    let isEinbuchung = false;
    if (orderart === "Kauf") {
      side = "buy";
    } else if (orderart === "Verkauf") {
      side = "sell";
    } else if (orderart === "Einbuchung") {
      side = "buy";
      isEinbuchung = true;
    } else if (orderart === "Ausbuchung") {
      side = "sell";
    } else {
      // Ausschüttung, unknown types, etc. — skip
      continue;
    }

    const isin = row[DAB_COL.ISIN]?.trim() ?? "";
    const yfTicker = resolveDABTicker(isin);
    if (!yfTicker) continue; // unmapped security — silently skip

    const name = row[DAB_COL.NAME]?.trim() ?? "";

    const qty = parseDABQty(row[DAB_COL.QTY]?.trim() ?? "");
    if (qty <= 0) continue;

    // Betrag (EUR): positive for buys, negative for sells/dividends.
    // amount=0 is legitimate and must NOT be skipped:
    //  - zero-cost Einbuchung = stock split (new shares added for free; missing
    //    them would leave qty wrong and inflate apparent per-share cost 3× etc.)
    //  - zero-proceeds Verkauf = disposal of worthless shares (must be tracked
    //    to correctly close the holding round, e.g. SPCE final sale at €0)
    const betrag = parseEuroNum(row[DAB_COL.BETRAG]?.trim() ?? "");
    const amount = Math.abs(betrag);

    // Price per share in EUR derived from settlement amount (0 for split shares)
    const price = qty > 0 ? amount / qty : 0;

    // Prefer execution date; fall back to order date
    const dateStr =
      row[DAB_COL.DATUM]?.trim() ||
      row[DAB_COL.AUFGABEDATUM]?.trim() ||
      "";
    const date = parseDABDate(dateStr);
    if (!date) continue;

    const trade: Trade = {
      date,
      tickerCode: isin,
      name,
      yfTicker,
      qty,
      price,
      amount,
      side,
      currency: "EUR",
    };

    if (isEinbuchung) {
      // Deduplicate: keep the highest-amount Einbuchung for each ISIN per day.
      // Currency-rebook sequences produce multiple Einbuchung rows for the same
      // ISIN on the same calendar day (one per intermediate currency); only the
      // final EUR-settled entry (largest amount) is the actual position transfer.
      const key = `${date.toISOString().slice(0, 10)}-${isin}`;
      const existing = einbuchungMap.get(key);
      if (!existing || amount > existing.amount) {
        einbuchungMap.set(key, trade);
      }
    } else {
      regularTrades.push(trade);
    }
  }

  return [...regularTrades, ...einbuchungMap.values()];
}

// ── Unified entry point ───────────────────────────────────────────────────────

/**
 * Parse a Rakuten Securities trade-history CSV export into Trade objects.
 *
 * Supports all three Rakuten sub-formats:
 *   - JP stocks:         tradehistory(JP)_*.csv    — has 銘柄コード column
 *   - Investment trusts: tradehistory(INVST)_*.csv — has ファンド名 column
 *   - US stocks:         tradehistory(US)_*.csv    — has ティッカー column
 *
 * Amounts are in JPY; no currency field is set (defaults to "JPY" in metrics).
 * Returns both buy and sell trades with the `side` field set accordingly.
 */
export function parseRakutenTrades(csvText: string): Trade[] {
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
      "Unsupported CSV format. Expected a Rakuten Securities trade history (JP stocks, US stocks, or investment trusts) or a DAB bank order history."
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
 * Parse a trade-history CSV into Trade objects.
 *
 * Automatically detects the broker format and delegates to the appropriate
 * parser.  Prefer calling the specific parser directly (parseDABTrades or
 * parseRakutenTrades) when the format is already known — this wrapper exists
 * for backward compatibility and auto-detection fallback only.
 */
export function parseTrades(csvText: string): Trade[] {
  if (isDABFormat(csvText)) {
    return parseDABTrades(csvText);
  }
  return parseRakutenTrades(csvText);
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
