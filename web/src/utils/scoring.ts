/**
 * Quantitative stock scoring engine.
 *
 * Ported from finance/scoring.py. Normalises raw financial metrics to 0–100
 * scores, aggregates them into five categories (Valuation, Quality, Health,
 * Growth, Momentum), computes a weighted final score, applies veto rules, and
 * maps everything to human-readable fuzzy labels and icons.
 *
 * Uses hardcoded fallback bands (METRIC_BANDS_FALLBACK) — mirrors the Python
 * behaviour when benchmark_stats.csv is absent.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CategoryResult {
  name: string;
  score: number;          // 0–100
  label: string;          // STRONG / GOOD / NEUTRAL / WEAK / POOR
  icon: string;           // colored circle emoji
  subScores: Record<string, number | null>;
}

export interface StockEvaluation {
  categories: Record<string, CategoryResult>;
  finalScore: number;
  finalSignal: string;
  rawMetrics: Record<string, number | null>;
  vetoed: boolean;
  vetoReasons: string[];
}

// ── Normalization bands ───────────────────────────────────────────────────────

// (low, high, invert)
type Band = [number, number, boolean];

export const METRIC_BANDS_FALLBACK: Record<string, Band> = {
  trailingPE:               [5,     40,    true],
  priceToBook:              [0.5,    8,    true],
  enterpriseToEbitda:       [3,     25,    true],
  returnOnEquity:           [0.0,    0.30, false],
  operatingMargins:         [0.0,    0.35, false],
  grossMargins:             [0.0,    0.70, false],
  dividendYield:            [0.0,    6.0,  false],
  payoutRatio:              [0.0,    1.0,  true],
  debtToEquity:             [0,    200,    true],
  currentRatio:             [0.5,    3.0,  false],
  fcfYield:                 [0.0,    0.10, false],
  earningsQuarterlyGrowth:  [-0.20,  0.30, false],
  revenueGrowth:            [-0.10,  0.30, false],
  recommendationScore:      [1,      5,    true],
  alpha_best:               [-0.10,  0.15, false],
  alpha_6m:                 [-0.15,  0.15, false],
  cagr_best:                [-0.05,  0.25, false],
  ret_6m:                   [-0.15,  0.20, false],
  ret_1m:                   [-0.10,  0.10, false],
};

// ── Category definitions ──────────────────────────────────────────────────────

export const CATEGORIES: Record<string, string[]> = {
  Valuation: ['trailingPE', 'priceToBook', 'enterpriseToEbitda'],
  Quality:   ['returnOnEquity', 'operatingMargins', 'grossMargins', 'dividendYield', 'payoutRatio'],
  Health:    ['debtToEquity', 'currentRatio', 'fcfYield'],
  Growth:    ['earningsQuarterlyGrowth', 'revenueGrowth', 'recommendationScore'],
  Momentum:  ['alpha_best', 'alpha_6m', 'cagr_best', 'ret_6m', 'ret_1m'],
};

export const CATEGORY_ABBREVS = ['Val', 'Qual', 'Health', 'Growth', 'Mom'];

export const METRIC_LABELS: Record<string, string> = {
  trailingPE:               'P/E (trailing)',
  priceToBook:              'Price / Book',
  enterpriseToEbitda:       'EV / EBITDA',
  returnOnEquity:           'Return on Equity',
  operatingMargins:         'Operating Margin',
  grossMargins:             'Gross Margin',
  dividendYield:            'Dividend Yield',
  payoutRatio:              'Payout Ratio',
  debtToEquity:             'Debt / Equity',
  currentRatio:             'Current Ratio',
  fcfYield:                 'FCF Yield',
  earningsQuarterlyGrowth:  'Quarterly Earnings Growth',
  revenueGrowth:            'Revenue Growth',
  recommendationScore:      'Analyst Recommendation',
  alpha_best:               'Alpha (best window)',
  alpha_6m:                 'Alpha 6M',
  cagr_best:                'CAGR (best window)',
  ret_6m:                   'Return 6M',
  ret_1m:                   'Return 1M',
};

// Metrics whose raw value is a 0–1 ratio displayed as a percentage
const PCT_METRICS = new Set([
  'returnOnEquity', 'operatingMargins', 'grossMargins',
  'payoutRatio',
  'earningsQuarterlyGrowth', 'revenueGrowth', 'fcfYield',
  'alpha_best', 'alpha_6m', 'cagr_best', 'ret_6m', 'ret_1m',
]);

// Metrics already in percent-form from the API (e.g. 2.09 means 2.09%)
const RAW_PCT_METRICS = new Set(['dividendYield']);

// Metrics displayed as multiples (×)
const MULTIPLE_METRICS = new Set(['trailingPE', 'priceToBook', 'enterpriseToEbitda', 'currentRatio']);

// D/E as reported by yfinance (already in %)
const DE_METRICS = new Set(['debtToEquity']);

export const DEFAULT_WEIGHTS: Record<string, number> = {
  Valuation: 0.15,
  Quality:   0.20,
  Health:    0.15,
  Growth:    0.25,
  Momentum:  0.25,
};

// ── Label / icon maps ─────────────────────────────────────────────────────────

const CATEGORY_LABEL_ICON: Record<string, string> = {
  STRONG:  '🔵',
  GOOD:    '🟢',
  NEUTRAL: '🟡',
  WEAK:    '🟠',
  POOR:    '🔴',
};

export const SIGNAL_COLOR: Record<string, string> = {
  STRONG_BUY:  '#22863a',
  BUY:         '#3b82f6',
  HOLD:        '#b59000',
  SELL:        '#d97706',
  STRONG_SELL: '#cb2431',
};

export const SIGNAL_ACTIONS: Record<string, string> = {
  STRONG_BUY:  'High conviction buy',
  BUY:         'Consider buying',
  HOLD:        'Monitor, no action',
  SELL:        'Consider avoiding',
  STRONG_SELL: 'Avoid',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isMissing(v: number | null | undefined): boolean {
  if (v == null) return true;
  return !isFinite(v) || isNaN(v);
}

function firstValid(...values: (number | null | undefined)[]): number | null {
  for (const v of values) {
    if (!isMissing(v)) return v as number;
  }
  return null;
}

/**
 * Linearly map value into 0–100 between low and high (clamped).
 * If invert=true the scale is reversed (lower raw → higher score).
 */
export function normalize(
  value: number | null | undefined,
  low: number,
  high: number,
  invert = false,
): number | null {
  if (isMissing(value)) return null;
  const v = value as number;
  if (high === low) return v >= high ? 100 : 0;
  let s = ((v - low) / (high - low)) * 100;
  if (invert) s = 100 - s;
  return Math.max(0, Math.min(100, s));
}

function normalizeMetric(
  name: string,
  value: number | null | undefined,
  bands: Record<string, Band> = METRIC_BANDS_FALLBACK,
): number | null {
  const band = bands[name];
  if (!band) return null;
  const [low, high, invert] = band;
  return normalize(value, low, high, invert);
}

// ── Fuzzy label mappings ──────────────────────────────────────────────────────

function fuzzyCategoryLabel(score: number): string {
  if (score > 80) return 'STRONG';
  if (score > 60) return 'GOOD';
  if (score > 40) return 'NEUTRAL';
  if (score > 20) return 'WEAK';
  return 'POOR';
}

export function fuzzyFinalSignal(score: number): string {
  if (score > 85) return 'STRONG_BUY';
  if (score > 70) return 'BUY';
  if (score > 50) return 'HOLD';
  if (score > 35) return 'SELL';
  return 'STRONG_SELL';
}

export function categoryIcons(evaluation: StockEvaluation): string {
  return Object.keys(CATEGORIES)
    .map((cat) => evaluation.categories[cat]?.icon ?? '⬜')
    .join('');
}

export function signalDisplay(evaluation: StockEvaluation): string {
  return `${evaluation.finalSignal} (${categoryIcons(evaluation)})`;
}

// ── Category scoring ──────────────────────────────────────────────────────────

function scoreCategory(
  categoryName: string,
  rawMetrics: Record<string, number | null>,
  bands: Record<string, Band> = METRIC_BANDS_FALLBACK,
): CategoryResult {
  const metricNames = CATEGORIES[categoryName] ?? [];
  const subScores: Record<string, number | null> = {};
  const valid: number[] = [];

  for (const m of metricNames) {
    const ns = normalizeMetric(m, rawMetrics[m], bands);
    subScores[m] = ns;
    if (ns !== null) valid.push(ns);
  }

  const catScore = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 50;
  const label = fuzzyCategoryLabel(catScore);
  const icon = CATEGORY_LABEL_ICON[label];

  return {
    name: categoryName,
    score: Math.round(catScore * 10) / 10,
    label,
    icon,
    subScores,
  };
}

// ── Final weighted score ──────────────────────────────────────────────────────

function computeFinalScore(
  categoryScores: Record<string, number>,
  weights: Record<string, number> = DEFAULT_WEIGHTS,
): number {
  const total = Object.keys(weights).reduce(
    (acc, cat) => acc + (categoryScores[cat] ?? 0) * weights[cat],
    0,
  );
  return Math.round(total * 10) / 10;
}

// ── Veto rules ────────────────────────────────────────────────────────────────

const SIGNAL_SEVERITY: Record<string, number> = {
  STRONG_BUY: 0, BUY: 1, HOLD: 2, SELL: 3, STRONG_SELL: 4,
};

interface VetoRule {
  check: (m: Record<string, number | null>) => boolean;
  forcedSignal: string;
  reason: string;
}

const VETO_RULES: VetoRule[] = [
  {
    check: (m) => !isMissing(m.debtToEquity) && (m.debtToEquity as number) > 500,
    forcedSignal: 'STRONG_SELL',
    reason: 'Extreme leverage (Debt/Equity > 5×)',
  },
  {
    check: (m) =>
      !isMissing(m.trailingPE) &&
      (m.trailingPE as number) < 0 &&
      !isMissing(m.freeCashflow) &&
      (m.freeCashflow as number) < 0,
    forcedSignal: 'SELL',
    reason: 'Unprofitable and cash-burning (negative P/E + negative FCF)',
  },
  {
    check: (m) =>
      !isMissing(m.alpha_best) &&
      (m.alpha_best as number) < -0.05 &&
      !isMissing(m.alpha_6m) &&
      (m.alpha_6m as number) < 0,
    forcedSignal: 'SELL',
    reason: 'Persistent benchmark underperformance (α < −5 pp long-term and still negative 6M)',
  },
];

function applyVetoes(
  rawMetrics: Record<string, number | null>,
  signal: string,
): { signal: string; reasons: string[] } {
  let resultSignal = signal;
  const reasons: string[] = [];

  for (const rule of VETO_RULES) {
    try {
      if (rule.check(rawMetrics)) {
        reasons.push(rule.reason);
        if ((SIGNAL_SEVERITY[rule.forcedSignal] ?? 2) > (SIGNAL_SEVERITY[resultSignal] ?? 2)) {
          resultSignal = rule.forcedSignal;
        }
      }
    } catch {
      // missing metric → skip rule
    }
  }

  return { signal: resultSignal, reasons };
}

// ── Top-level orchestrator ────────────────────────────────────────────────────

export function evaluateStock(
  rawMetrics: Record<string, number | null>,
  weights: Record<string, number> = DEFAULT_WEIGHTS,
  bands: Record<string, Band> = METRIC_BANDS_FALLBACK,
): StockEvaluation {
  const categories: Record<string, CategoryResult> = {};
  const catScores: Record<string, number> = {};

  for (const catName of Object.keys(CATEGORIES)) {
    const result = scoreCategory(catName, rawMetrics, bands);
    categories[catName] = result;
    catScores[catName] = result.score;
  }

  const finalScore = computeFinalScore(catScores, weights);
  const rawSignal = fuzzyFinalSignal(finalScore);
  const { signal: finalSignal, reasons: vetoReasons } = applyVetoes(rawMetrics, rawSignal);

  return {
    categories,
    finalScore,
    finalSignal,
    rawMetrics,
    vetoed: finalSignal !== rawSignal,
    vetoReasons,
  };
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function fmtRawMetric(name: string, value: number | null | undefined): string {
  if (isMissing(value)) return '—';
  const v = value as number;
  if (RAW_PCT_METRICS.has(name)) return `${v.toFixed(2)}%`;
  if (PCT_METRICS.has(name)) {
    const abs = Math.abs(v);
    const str = abs < 10 ? `${(abs * 100).toFixed(1)}%` : `${(abs * 100).toFixed(0)}%`;
    return (v >= 0 ? '+' : '−') + str;
  }
  if (DE_METRICS.has(name)) return `${v.toFixed(0)}%`;
  if (MULTIPLE_METRICS.has(name)) return `${v.toFixed(1)}×`;
  if (name === 'recommendationScore') return `${v.toFixed(1)} / 5`;
  return v.toFixed(2);
}

export function fmtPct(value: number | null | undefined): string {
  if (isMissing(value)) return '—';
  const v = value as number;
  const abs = Math.abs(v);
  const str = abs < 10 ? `${(abs * 100).toFixed(1)}%` : `${(abs * 100).toFixed(0)}%`;
  return (v >= 0 ? '+' : '−') + str;
}

export function pctColor(value: number | null | undefined): string {
  if (isMissing(value)) return '#6b7280';
  return (value as number) >= 0 ? '#22863a' : '#cb2431';
}

export { firstValid };
