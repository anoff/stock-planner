import type { Translations } from './translations';

const en: Translations = {
  // ── App shell ──────────────────────────────────────────────────────────────
  appTitle: 'Stock Planner',
  tabResearch: 'Research',
  tabPortfolio: 'Rakuten Analysis',
  descResearch:
    'Enter tickers to get a quantitative research report with scoring across Valuation, Quality, Health, Growth & Momentum.',
  descPortfolio: (benchmark) =>
    `Drop one or more Rakuten Securities CSVs to analyze performance vs ${benchmark}`,

  // ── Header controls ────────────────────────────────────────────────────────
  showValues: 'show values',
  hideValues: 'hide values',
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode',
  switchToJapanese: 'Switch to Japanese',
  switchToEnglish: 'Switch to English',

  // ── Fetching / progress ────────────────────────────────────────────────────
  fetchingPrices: (done, total) => `Fetching price data… ${done}/${total}`,
  fetchingFundamentals: (done, total) => `Fetching fundamentals… ${done}/${total}`,

  // ── Error / warning messages ───────────────────────────────────────────────
  noBuyTrades: 'No buy trades found.',
  noMetrics:
    'Could not calculate metrics for any position. Price data may be unavailable.',
  noPriceData:
    'Could not fetch any price data. Check ticker symbols and network connection.',
  noResults:
    'No results — price data may be unavailable for the given tickers.',
  tryAgain: 'Try again',
  pricesUnavailableFor: (tickers) => `Price data unavailable for: ${tickers}`,
  fundamentalsUnavailableFor: (tickers) =>
    `Fundamental data unavailable for: ${tickers} — scores based on price metrics only`,

  // ── Portfolio results ──────────────────────────────────────────────────────
  loadNewFiles: '↩ Load new files',
  positionHistoryCharts: '📉 Position History Charts',
  chartLegendText:
    'Price timeseries with B = buy, S = sell markers.',
  hideCharts: 'Hide Charts',
  showCharts: '📈 Show Charts',
  footer:
    'Data sourced from Yahoo Finance. All calculations are performed in the browser.',

  // ── Summary card ──────────────────────────────────────────────────────────
  portfolioSummary: '📋 Portfolio Summary',
  labelPositions: 'Positions',
  labelTotalProfit: 'Total Profit',
  labelTotalReturn: 'Total Return',
  labelPortfolioAlpha: 'Portfolio Alpha',
  outperforming: (pct, benchmark) =>
    `${Math.round(pct * 100)}% outperforming vs ${benchmark}`,

  // ── Metrics table ─────────────────────────────────────────────────────────
  positionMetrics: '📊 Position Metrics',
  colName: 'Name',
  colProfit: 'Profit',
  colTicker: 'Ticker',
  colCagr: 'CAGR',
  colAlphaCagr: 'α CAGR',
  col1m: '1M',
  col6m: '6M',
  colTotalReturn: 'Total Return',
  colDaysHeld: 'Days Held',
  colScore: 'Score',
  colSignal: 'Signal',
  tooEarlyLabel:
    '⏳ Too Early — held <3 months, sorted by total return',

  // ── Drop zone ─────────────────────────────────────────────────────────────
  dropHere: 'Drop your Rakuten CSVs here',
  dropMoreFiles: 'Drop more files or browse to add',
  dropHint:
    'You can mix JP, US and fund CSV files — duplicates across files are removed automatically',
  browseFiles: 'Browse files',
  fixErrorsBeforeAnalyzing: 'Fix errors before analyzing',
  dropTradesSuffix: ' trades',
  dropTradeSeparator: ' · ',
  dropPositionSuffix: (n) => (n === 1 ? ' position' : ' positions'),
  analyzeBtn: 'Analyze →',
  removeFile: 'Remove file',
  errorBadge: 'error',
  tradesBadge: (n) => `${n} trades`,

  // ── Closed positions ──────────────────────────────────────────────────────
  closedPositions: (n) => `🗂️ Closed Positions (${n})`,
  hide: '▲ hide',
  show: '▼ show',
  colFirstBuy: 'First Buy',
  colLastSell: 'Last Sell',

  // ── Ticker input ──────────────────────────────────────────────────────────
  labelTickers: 'Tickers',
  labelBenchmark: 'Benchmark',
  analyzing: 'Loading…',
  analyze: 'Analyze',
  tickerInputHint:
    'Comma or space separated Yahoo Finance tickers. Fetches 5 years of price history plus fundamental data.',

  // ── Research overview ─────────────────────────────────────────────────────
  overview: 'Overview',
  colCcy: 'CCY',
  colCagr5y: '5Y CAGR',
  colCagr3y: '3Y CAGR',
  colCagr1y: '1Y CAGR',
  colAlpha1y: 'α 1Y',
  col6mShort: '6M',
  col1mShort: '1M',
  signalWithAbbrevs: (abbrevs) => `Signal (${abbrevs})`,
  clickToExpand: 'Click to expand detail',

  // ── Stock detail ──────────────────────────────────────────────────────────
  priceUnavailable: 'Price unavailable',
  closeOf: (date) => `close of ${date}`,
  vetoOverride: 'Veto override:',
  scoringBreakdown: 'Scoring Breakdown',
  colCategory: 'Category',
  colLabel: 'Label',
  finalLabel: 'Final',
  pricePerformance: 'Price & Performance',
  dataAvailable: 'Data available',
  months: 'months',
  metricDetails: 'Metric Details',
  colMetric: 'Metric',
  colRaw: 'Raw',
  colNormalized: 'Normalized',
  scoreStrong: 'Strong',
  scoreGood: 'Good',
  scoreNeutral: 'Neutral',
  scoreWeak: 'Weak',
  scorePoor: 'Poor',

  // ── Research legend ───────────────────────────────────────────────────────
  signalLegend: 'Signal Legend',
  finalSignalLabel: 'Final Signal',
  signalCol: 'Signal',
  scoreCol: 'Score',
  actionCol: 'Action',
  strongBuyAction: 'High conviction buy',
  buyAction: 'Consider buying',
  holdAction: 'Monitor, no action',
  sellAction: 'Consider avoiding',
  strongSellAction: 'Avoid',
  categoryIconsLabel: 'Category Icons',
  iconCol: 'Icon',
  labelCol: 'Label',
  disclaimer:
    'Data sourced from Yahoo Finance via yahoo-finance2. Prices are split- and dividend-adjusted closing prices. 6M/1M windows = 180/30 calendar days; nearest prior trading-day close is used at both ends. Fundamental data is best-effort and may be unavailable for some tickers.',
};

export default en;
