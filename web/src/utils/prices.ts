import type { PriceHistory, PriceData } from "./types";

/** Yahoo Finance v8 chart API base URL. */
const YF_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

/**
 * CORS proxy used in production to work around Yahoo Finance's missing
 * Access-Control-Allow-Origin header.  corsproxy.io is open-source and
 * free; it simply forwards the request and adds the CORS header.
 * Usage: prefix the target URL with this string (no extra encoding needed).
 */
const CORS_PROXY = "https://corsproxy.io/?";

/**
 * Fetch historical price data for a list of tickers.
 *
 * Routes requests through corsproxy.io because Yahoo Finance does not send
 * Access-Control-Allow-Origin headers for direct browser requests.
 * Works identically in dev and production.
 */
export async function fetchPriceData(
  tickers: string[],
  onProgress?: (done: number, total: number) => void
): Promise<PriceData> {
  const uniqueTickers = [...new Set(tickers)];
  const result: PriceData = {};
  let done = 0;

  for (const ticker of uniqueTickers) {
    try {
      const history = await fetchTickerHistory(ticker);
      if (history.length > 0) {
        result[ticker] = history;
      }
    } catch (err) {
      console.warn(`Failed to fetch price data for ${ticker}:`, err);
    }
    done++;
    onProgress?.(done, uniqueTickers.length);
  }

  return result;
}

/**
 * Fetch ~5 years of daily close prices for a single ticker.
 *
 * Uses the Yahoo Finance v8 chart API via corsproxy.io CORS proxy.
 * The chart endpoint does not require crumb/cookie authentication.
 * Works identically in dev and production.
 */
async function fetchTickerHistory(ticker: string): Promise<PriceHistory> {
  const now = Math.floor(Date.now() / 1000);
  const fiveYearsAgo = now - 5 * 365 * 24 * 3600;
  const yfUrl =
    `${YF_CHART_BASE}/${encodeURIComponent(ticker)}` +
    `?interval=1d&period1=${fiveYearsAgo}&period2=${now}`;
  const url = `${CORS_PROXY}${encodeURIComponent(yfUrl)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${ticker}`);
  }

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No chart data returned for ${ticker}`);
  }

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

  return timestamps
    .map((ts, i) => ({ date: new Date(ts * 1000), close: closes[i] }))
    .filter(
      (d): d is { date: Date; close: number } =>
        d.close != null && isFinite(d.close)
    );
}

/**
 * Get the closing price on or just before the given date.
 */
export function priceOn(
  history: PriceHistory | undefined,
  date: Date
): number | null {
  if (!history || history.length === 0) return null;
  const ts = date.getTime();

  // Find the last entry whose date is <= target date
  let best: number | null = null;
  for (const rec of history) {
    if (rec.date.getTime() <= ts) {
      best = rec.close;
    } else {
      break;
    }
  }
  return best;
}

/**
 * Calculate total return between two dates: (P1 - P0) / P0
 */
export function periodReturn(
  history: PriceHistory | undefined,
  t0: Date,
  t1: Date
): number | null {
  const p0 = priceOn(history, t0);
  const p1 = priceOn(history, t1);
  if (p0 == null || p1 == null || p0 <= 0) return null;
  return (p1 - p0) / p0;
}
