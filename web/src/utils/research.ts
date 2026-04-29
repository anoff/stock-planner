/**
 * Research tool data fetching and metrics computation.
 *
 * Mirrors the logic in finance/research.py:
 *   - fetchStockInfo()     → /api/info/:ticker
 *   - computeResearchMetrics() → combines price-based metrics with fundamentals
 *     and runs the scoring engine for each ticker.
 */

import type { PriceData, PriceHistory } from './types';
import { periodReturn, priceOn } from './prices';
import { evaluateStock, firstValid, fmtPct } from './scoring';
import type { StockEvaluation } from './scoring';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Fundamental data returned by /api/info/:ticker */
export interface StockInfo {
  longName: string;
  shortName: string;
  currency: string;
  // Valuation
  trailingPE: number | null;
  priceToBook: number | null;
  enterpriseToEbitda: number | null;
  // Quality
  returnOnEquity: number | null;
  operatingMargins: number | null;
  grossMargins: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  // Health
  debtToEquity: number | null;
  currentRatio: number | null;
  freeCashflow: number | null;
  marketCap: number | null;
  // Growth
  earningsQuarterlyGrowth: number | null;
  revenueGrowth: number | null;
  recommendationMean: number | null;
}

/** Full research result for one ticker */
export interface ResearchResult {
  ticker: string;
  name: string;
  currency: string;
  currentPrice: number | null;
  priceDate: string | null;
  refDate6m: string | null;
  refDate1m: string | null;
  dataMonths: number;
  ret6m: number | null;
  ret1m: number | null;
  cagr1y: number | null;
  cagr3y: number | null;
  cagr5y: number | null;
  alpha1y: number | null;
  alpha3y: number | null;
  alpha5y: number | null;
  alpha6m: number | null;
  alpha1m: number | null;
  benchmark: string;
  evaluation: StockEvaluation;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

/**
 * Yahoo Finance fundamentalsTimeSeries API base URL.
 * Unlike quoteSummary (v10), this endpoint does NOT require crumb/cookie auth.
 */
const YF_TIMESERIES_BASE =
  'https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries';

/**
 * CORS proxy used in production to work around Yahoo Finance's missing
 * Access-Control-Allow-Origin header (same proxy as used for price data).
 */
const CORS_PROXY = 'https://corsproxy.io/?';

/**
 * Extract a numeric value from a Yahoo Finance raw API field.
 * The API may return plain numbers *or* `{ raw: number, fmt: string }` objects.
 */
export function rawNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v === 'object' && v !== null && 'raw' in v) {
    const raw = (v as Record<string, unknown>).raw;
    return typeof raw === 'number' && isFinite(raw) ? raw : null;
  }
  return null;
}

export function rawStr(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  return fallback;
}

// ── fundamentalsTimeSeries helpers ────────────────────────────────────────────

/** Keys we request from the fundamentalsTimeSeries API. */
const TRAILING_KEYS = [
  'NetIncome', 'TotalRevenue', 'OperatingIncome', 'GrossProfit',
  'DilutedEPS', 'FreeCashFlow',
] as const;

const QUARTERLY_KEYS = [
  'NetIncome', 'TotalRevenue',
] as const;

const BALANCE_SHEET_KEYS = [
  'StockholdersEquity', 'TotalDebt', 'CurrentAssets',
  'CurrentLiabilities', 'OrdinarySharesNumber',
  'CashAndCashEquivalents',
] as const;

/**
 * Parse the fundamentalsTimeSeries response and compute financial ratios.
 *
 * Uses the trailing (TTM) time-series data combined with the most recent
 * quarterly balance sheet snapshot and current price to derive the same
 * metrics that quoteSummary would provide.
 */
export function parseFundamentalsTimeSeries(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: Record<string, any>,
  ticker: string,
  currentPrice: number | null,
): StockInfo | null {
  const results = response?.timeseries?.result;
  if (!Array.isArray(results) || results.length === 0) return null;

  // Build a lookup: key → latest reported value
  const latest: Record<string, number | null> = {};
  for (const series of results) {
    const metaType: string = series.meta?.type?.[0] ?? '';
    // Find the data array (it's the key that isn't 'meta' or 'timestamp')
    const dataKey = Object.keys(series).find(
      k => k !== 'meta' && k !== 'timestamp',
    );
    if (!dataKey) continue;

    const dataArr = series[dataKey];
    if (!Array.isArray(dataArr)) continue;

    // Get the last non-null reported value
    for (let i = dataArr.length - 1; i >= 0; i--) {
      const entry = dataArr[i];
      if (entry && entry.reportedValue?.raw != null) {
        latest[metaType] = entry.reportedValue.raw;
        break;
      }
    }
  }

  // Extract values
  const ttmNetIncome     = latest['trailingNetIncome'] ?? null;
  const ttmRevenue       = latest['trailingTotalRevenue'] ?? null;
  const ttmOperating     = latest['trailingOperatingIncome'] ?? null;
  const ttmGross         = latest['trailingGrossProfit'] ?? null;
  const ttmDilutedEPS    = latest['trailingDilutedEPS'] ?? null;
  const ttmFreeCashFlow  = latest['trailingFreeCashFlow'] ?? null;
  const equity           = latest['quarterlyStockholdersEquity'] ?? null;
  const totalDebt        = latest['quarterlyTotalDebt'] ?? null;
  const currentAssets    = latest['quarterlyCurrentAssets'] ?? null;
  const currentLiab      = latest['quarterlyCurrentLiabilities'] ?? null;
  const sharesOut        = latest['quarterlyOrdinarySharesNumber'] ?? null;
  const cash             = latest['quarterlyCashAndCashEquivalents'] ?? null;

  // Quarterly net income for YoY growth (need current + year-ago quarter)
  const qNetIncomes: { ts: number; val: number }[] = [];
  const qRevenues:   { ts: number; val: number }[] = [];
  for (const series of results) {
    const metaType: string = series.meta?.type?.[0] ?? '';
    const dataKey = Object.keys(series).find(
      k => k !== 'meta' && k !== 'timestamp',
    );
    if (!dataKey) continue;
    const dataArr = series[dataKey];
    const timestamps: number[] | undefined = series.timestamp;
    if (!Array.isArray(dataArr) || !Array.isArray(timestamps)) continue;

    if (metaType === 'quarterlyNetIncome') {
      for (let i = 0; i < dataArr.length; i++) {
        if (dataArr[i]?.reportedValue?.raw != null) {
          qNetIncomes.push({ ts: timestamps[i], val: dataArr[i].reportedValue.raw });
        }
      }
    }
    if (metaType === 'quarterlyTotalRevenue') {
      for (let i = 0; i < dataArr.length; i++) {
        if (dataArr[i]?.reportedValue?.raw != null) {
          qRevenues.push({ ts: timestamps[i], val: dataArr[i].reportedValue.raw });
        }
      }
    }
  }

  // Compute YoY quarterly growth
  const earningsQuarterlyGrowth = computeYoYGrowth(qNetIncomes);
  const revenueGrowth = computeYoYGrowth(qRevenues);

  // Compute derived metrics
  const marketCap = sharesOut && currentPrice ? sharesOut * currentPrice : null;
  const trailingPE = ttmDilutedEPS && currentPrice && ttmDilutedEPS > 0
    ? currentPrice / ttmDilutedEPS : null;
  const priceToBook = equity && marketCap && equity > 0
    ? marketCap / equity : null;
  const returnOnEquity = ttmNetIncome !== null && equity && equity > 0
    ? ttmNetIncome / equity : null;
  const operatingMargins = ttmOperating !== null && ttmRevenue && ttmRevenue > 0
    ? ttmOperating / ttmRevenue : null;
  const grossMargins = ttmGross !== null && ttmRevenue && ttmRevenue > 0
    ? ttmGross / ttmRevenue : null;
  const debtToEquity = totalDebt !== null && equity && equity > 0
    ? (totalDebt / equity) * 100 : null; // Yahoo reports as percentage
  const currentRatio = currentAssets !== null && currentLiab && currentLiab > 0
    ? currentAssets / currentLiab : null;

  // Enterprise value to EBITDA (approximation)
  // EV = market cap + total debt - cash; EBITDA ≈ operating income (simplified)
  const ev = marketCap !== null && totalDebt !== null && cash !== null
    ? marketCap + totalDebt - cash : null;
  const enterpriseToEbitda = ev !== null && ttmOperating && ttmOperating > 0
    ? ev / ttmOperating : null;

  return {
    longName:  ticker,
    shortName: ticker,
    currency:  '',
    trailingPE,
    priceToBook,
    enterpriseToEbitda,
    returnOnEquity,
    operatingMargins,
    grossMargins,
    dividendYield: null,  // Not available from fundamentalsTimeSeries
    payoutRatio: null,    // Not available from fundamentalsTimeSeries
    debtToEquity,
    currentRatio,
    freeCashflow: ttmFreeCashFlow,
    marketCap,
    earningsQuarterlyGrowth,
    revenueGrowth,
    recommendationMean: null, // Not available from fundamentalsTimeSeries
  };
}

/**
 * Compute year-over-year growth from quarterly data points.
 * Compares the most recent quarter to the same quarter one year ago.
 */
function computeYoYGrowth(quarters: { ts: number; val: number }[]): number | null {
  if (quarters.length < 5) return null; // Need at least 5 quarters for YoY
  // Sort by timestamp descending
  const sorted = [...quarters].sort((a, b) => b.ts - a.ts);
  const recent = sorted[0];
  // Find the quarter closest to 1 year ago (roughly 4 quarters back)
  const yearAgo = sorted.find(q => q.ts < recent.ts - 270 * 86400);
  if (!yearAgo || yearAgo.val === 0) return null;
  return (recent.val - yearAgo.val) / Math.abs(yearAgo.val);
}

export async function fetchStockInfo(
  ticker: string,
  currentPrice?: number | null,
): Promise<StockInfo | null> {
  try {
    // Use fundamentalsTimeSeries API via CORS proxy (no crumb/cookie auth required).
    // Works identically in dev and production.
    const now = Math.floor(Date.now() / 1000);
    const twoYearsAgo = now - 2 * 365 * 86400;

    // Build type parameter: trailing TTM + quarterly balance sheet
    const trailingTypes = TRAILING_KEYS.map(k => `trailing${k}`);
    const quarterlyTypes = [
      ...QUARTERLY_KEYS.map(k => `quarterly${k}`),
      ...BALANCE_SHEET_KEYS.map(k => `quarterly${k}`),
    ];
    const allTypes = [...trailingTypes, ...quarterlyTypes].join(',');

    const yfUrl =
      `${YF_TIMESERIES_BASE}/${encodeURIComponent(ticker)}` +
      `?type=${allTypes}&period1=${twoYearsAgo}&period2=${now}` +
      `&merge=false&padTimeSeries=true&lang=en-US&region=US`;
    const url = `${CORS_PROXY}${encodeURIComponent(yfUrl)}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    return parseFundamentalsTimeSeries(data, ticker, currentPrice ?? null);
  } catch {
    return null;
  }
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function priceDateOn(history: PriceHistory | undefined, date: Date): string | null {
  if (!history || history.length === 0) return null;
  const ts = date.getTime();
  let best: Date | null = null;
  for (const rec of history) {
    if (rec.date.getTime() <= ts) best = rec.date;
    else break;
  }
  return best ? best.toISOString().slice(0, 10) : null;
}

function cagr(totalReturn: number | null, years: number): number | null {
  if (totalReturn === null || years <= 0) return null;
  return Math.pow(1 + totalReturn, 1 / years) - 1;
}

// ── Core metrics computation ──────────────────────────────────────────────────

export interface ResearchProgress {
  stage: 'prices' | 'info';
  done: number;
  total: number;
}

/**
 * For a list of tickers + benchmark, fetch price data and fundamental info,
 * then run the scoring engine for each ticker.
 *
 * onProgress is called after each fetch to allow the UI to show a progress bar.
 * priceData can be passed in if already fetched (e.g. to avoid re-fetching).
 */
export async function computeResearchMetrics(
  tickers: string[],
  benchmark: string,
  priceData: PriceData,
  onProgress?: (p: ResearchProgress) => void,
): Promise<ResearchResult[]> {
  const today = new Date();

  const cutoffs = {
    '1y': new Date(today.getTime() - 365 * 86400_000),
    '3y': new Date(today.getTime() - (3 * 365 - 3) * 86400_000),
    '5y': new Date(today.getTime() - (5 * 365 - 5) * 86400_000),
    '6m': new Date(today.getTime() - 180 * 86400_000),
    '1m': new Date(today.getTime() - 30 * 86400_000),
  };

  const bmHist = priceData[benchmark];
  const bmRet = {
    '1y': periodReturn(bmHist, cutoffs['1y'], today),
    '3y': periodReturn(bmHist, cutoffs['3y'], today),
    '5y': periodReturn(bmHist, cutoffs['5y'], today),
    '6m': periodReturn(bmHist, cutoffs['6m'], today),
    '1m': periodReturn(bmHist, cutoffs['1m'], today),
  };
  const bmCagr1y = cagr(bmRet['1y'], 1);
  const bmCagr3y = cagr(bmRet['3y'], 3);
  const bmCagr5y = cagr(bmRet['5y'], 5);

  // Fetch fundamental info for all tickers
  const infoMap: Record<string, StockInfo | null> = {};
  for (let i = 0; i < tickers.length; i++) {
    const tickerHist = priceData[tickers[i]];
    const currentPrice = tickerHist ? priceOn(tickerHist, today) : null;
    infoMap[tickers[i]] = await fetchStockInfo(tickers[i], currentPrice);
    onProgress?.({ stage: 'info', done: i + 1, total: tickers.length });
  }

  const results: ResearchResult[] = [];

  for (const ticker of tickers) {
    const hist = priceData[ticker];
    if (!hist || hist.length === 0) continue;

    const info = infoMap[ticker];
    const name = info?.longName || info?.shortName || ticker;
    const currency = info?.currency ?? '';

    const firstDate = hist[0].date;
    const dataMonths = (today.getTime() - firstDate.getTime()) / (30.44 * 86400_000);

    const ret = {
      '1y': periodReturn(hist, cutoffs['1y'], today),
      '3y': periodReturn(hist, cutoffs['3y'], today),
      '5y': periodReturn(hist, cutoffs['5y'], today),
      '6m': periodReturn(hist, cutoffs['6m'], today),
      '1m': periodReturn(hist, cutoffs['1m'], today),
    };

    const cagr1y = cagr(ret['1y'], 1);
    const cagr3y = cagr(ret['3y'], 3);
    const cagr5y = cagr(ret['5y'], 5);

    const alpha1y = cagr1y !== null && bmCagr1y !== null ? cagr1y - bmCagr1y : null;
    const alpha3y = cagr3y !== null && bmCagr3y !== null ? cagr3y - bmCagr3y : null;
    const alpha5y = cagr5y !== null && bmCagr5y !== null ? cagr5y - bmCagr5y : null;
    const alpha6m  = ret['6m'] !== null && bmRet['6m'] !== null ? ret['6m']! - bmRet['6m']! : null;
    const alpha1m  = ret['1m'] !== null && bmRet['1m'] !== null ? ret['1m']! - bmRet['1m']! : null;

    const currentPrice = priceOn(hist, today);
    const priceDate    = priceDateOn(hist, today);
    const refDate6m    = priceDateOn(hist, cutoffs['6m']);
    const refDate1m    = priceDateOn(hist, cutoffs['1m']);

    const mcap = info?.marketCap ?? null;
    const fcf  = info?.freeCashflow ?? null;
    const fcfYield = mcap && fcf !== null && mcap > 0 ? fcf / mcap : null;

    const rawMetrics: Record<string, number | null> = {
      // Valuation
      trailingPE:               info?.trailingPE              ?? null,
      priceToBook:              info?.priceToBook             ?? null,
      enterpriseToEbitda:       info?.enterpriseToEbitda      ?? null,
      // Quality
      returnOnEquity:           info?.returnOnEquity          ?? null,
      operatingMargins:         info?.operatingMargins        ?? null,
      grossMargins:             info?.grossMargins            ?? null,
      dividendYield:            info?.dividendYield           ?? null,
      payoutRatio:              info?.payoutRatio             ?? null,
      // Health
      debtToEquity:             info?.debtToEquity            ?? null,
      currentRatio:             info?.currentRatio            ?? null,
      fcfYield,
      freeCashflow:             fcf,
      // Growth
      earningsQuarterlyGrowth:  info?.earningsQuarterlyGrowth ?? null,
      revenueGrowth:            info?.revenueGrowth           ?? null,
      recommendationScore:      info?.recommendationMean      ?? null,
      // Momentum (price-derived)
      alpha_best: firstValid(alpha5y, alpha3y, alpha1y),
      alpha_6m:   alpha6m,
      cagr_best:  firstValid(cagr5y, cagr3y, cagr1y),
      ret_6m:     ret['6m'],
      ret_1m:     ret['1m'],
    };

    const evaluation = evaluateStock(rawMetrics);

    results.push({
      ticker,
      name: name.slice(0, 30),
      currency,
      currentPrice,
      priceDate,
      refDate6m,
      refDate1m,
      dataMonths: Math.round(dataMonths * 10) / 10,
      ret6m:  ret['6m'],
      ret1m:  ret['1m'],
      cagr1y,
      cagr3y,
      cagr5y,
      alpha1y,
      alpha3y,
      alpha5y,
      alpha6m,
      alpha1m,
      benchmark,
      evaluation,
    });
  }

  // Sort by final score descending
  results.sort((a, b) => b.evaluation.finalScore - a.evaluation.finalScore);
  return results;
}

// ── Currency formatting ───────────────────────────────────────────────────────

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$', EUR: '€', JPY: '¥', GBP: '£', AUD: 'A$', CAD: 'C$',
  CHF: 'CHF ', HKD: 'HK$', SGD: 'S$', KRW: '₩', CNY: '¥',
  SEK: 'kr ', NOK: 'kr ', DKK: 'kr ',
};

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW']);

export function fmtPrice(price: number | null, currency: string): string {
  if (price === null) return '—';
  const decimals = ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `;
  return `${symbol}${price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export { fmtPct };
