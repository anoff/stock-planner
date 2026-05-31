import type { PriceHistory, PriceData } from "./types";

/** Yahoo Finance v8 chart API base URL. */
const YF_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

/**
 * Cloudflare Worker CORS proxy URL, injected at build time via VITE_CORS_PROXY.
 * Set in web/.env.production or as a GitHub Actions secret.
 * See docs/cors-proxy.md for setup instructions.
 */
const CORS_PROXY: string = import.meta.env.VITE_CORS_PROXY as string;

/** Maximum number of price-fetch requests to run in parallel. */
const CONCURRENT_REQUESTS = 3;

export interface FetchPriceResult {
  data: PriceData;
  /** Tickers for which the fetch failed (network error, non-2xx response, etc.) */
  failed: string[];
}

/**
 * Fetch historical price data for a list of tickers.
 * Requests are batched in groups of CONCURRENT_REQUESTS so the CORS proxy
 * is not overwhelmed while still being faster than fully sequential fetching.
 * Returns both the successful data and any tickers that failed to load
 * so callers can surface errors in the UI rather than silently dropping them.
 */
export async function fetchPriceData(
  tickers: string[],
  onProgress?: (done: number, total: number) => void
): Promise<FetchPriceResult> {
  const uniqueTickers = [...new Set(tickers)];
  const data: PriceData = {};
  const failed: string[] = [];
  let done = 0;

  // Process tickers in concurrent batches.
  for (let i = 0; i < uniqueTickers.length; i += CONCURRENT_REQUESTS) {
    const batch = uniqueTickers.slice(i, i + CONCURRENT_REQUESTS);
    await Promise.all(
      batch.map(async (ticker) => {
        try {
          const history = await fetchTickerHistory(ticker);
          if (history.length > 0) {
            data[ticker] = history;
          } else {
            failed.push(ticker);
          }
        } catch (err) {
          console.warn(`Failed to fetch price data for ${ticker}:`, err);
          failed.push(ticker);
        }
        done++;
        onProgress?.(done, uniqueTickers.length);
      })
    );
  }

  return { data, failed };
}

/**
 * Fetch ~5 years of daily close prices for a single ticker.
 * Throws on HTTP errors or missing data so callers can track failures.
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
