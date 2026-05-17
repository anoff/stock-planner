/** All translatable strings used across the app. */
export interface Translations {
  // ── App shell ──────────────────────────────────────────────────────────────
  appTitle: string;
  tabResearch: string;
  tabPortfolio: string;
  descResearch: string;
  descPortfolio: (benchmark: string) => string;

  // ── Header controls ────────────────────────────────────────────────────────
  showValues: string;
  hideValues: string;
  switchToLight: string;
  switchToDark: string;
  switchToJapanese: string;
  switchToEnglish: string;

  // ── Fetching / progress ────────────────────────────────────────────────────
  fetchingPrices: (done: number, total: number) => string;
  fetchingFundamentals: (done: number, total: number) => string;

  // ── Error / warning messages ───────────────────────────────────────────────
  noBuyTrades: string;
  noMetrics: string;
  noPriceData: string;
  noResults: string;
  tryAgain: string;
  pricesUnavailableFor: (tickers: string) => string;
  fundamentalsUnavailableFor: (tickers: string) => string;

  // ── Portfolio results ──────────────────────────────────────────────────────
  loadNewFiles: string;
  positionHistoryCharts: string;
  chartLegendText: string;
  hideCharts: string;
  showCharts: string;
  footer: string;

  // ── Benchmark row ─────────────────────────────────────────────────────────
  referenceBenchmark: string;

  // ── Outperformance chart ──────────────────────────────────────────────────
  outperformanceBreakdown: string;
  outperformanceDesc: (benchmark: string) => string;
  tooltipOutperforming: string;
  tooltipUnderperforming: string;
  tooltipProfitable: string;
  tooltipUnprofitable: string;
  barAlphaCagrCount: string;
  barAlphaCagrVolume: string;
  barCagrCount: string;
  barCagrVolume: string;

  // ── Summary card ──────────────────────────────────────────────────────────
  portfolioSummary: string;
  labelPositions: string;
  labelTotalProfit: string;
  labelTotalReturn: string;
  labelPortfolioAlpha: string;
  outperforming: (pct: number, benchmark: string) => string;

  // ── Metrics table ─────────────────────────────────────────────────────────
  positionMetrics: string;
  colName: string;
  colProfit: string;
  colTicker: string;
  colCagr: string;
  colAlphaCagr: string;
  col1m: string;
  col6m: string;
  colTotalReturn: string;
  colDaysHeld: string;
  colScore: string;
  colSignal: string;
  tooEarlyLabel: string;
  signalLabels: Record<string, string>;

  // ── Drop zone ─────────────────────────────────────────────────────────────
  dropHere: string;
  dropMoreFiles: string;
  dropHint: string;
  browseFiles: string;
  fixErrorsBeforeAnalyzing: string;
  dropTradesSuffix: string;
  dropTradeSeparator: string;
  dropPositionSuffix: (n: number) => string;
  analyzeBtn: string;
  removeFile: string;
  errorBadge: string;
  tradesBadge: (n: number) => string;

  // ── Closed positions ──────────────────────────────────────────────────────
  closedPositions: (n: number) => string;
  hide: string;
  show: string;
  colFirstBuy: string;
  colLastSell: string;

  // ── Ticker input ──────────────────────────────────────────────────────────
  labelTickers: string;
  labelBenchmark: string;
  analyzing: string;
  analyze: string;
  tickerInputHint: string;

  // ── Research overview ─────────────────────────────────────────────────────
  overview: string;
  colCcy: string;
  colCagr5y: string;
  colCagr3y: string;
  colCagr1y: string;
  colAlpha1y: string;
  col6mShort: string;
  col1mShort: string;
  signalWithAbbrevs: (abbrevs: string) => string;
  clickToExpand: string;

  // ── Stock detail ──────────────────────────────────────────────────────────
  priceUnavailable: string;
  closeOf: (date: string) => string;
  vetoOverride: string;
  scoringBreakdown: string;
  colCategory: string;
  colLabel: string;
  finalLabel: string;
  pricePerformance: string;
  dataAvailable: string;
  months: string;
  metricDetails: string;
  colMetric: string;
  colRaw: string;
  colNormalized: string;
  scoreStrong: string;
  scoreGood: string;
  scoreNeutral: string;
  scoreWeak: string;
  scorePoor: string;

  // ── Research legend ───────────────────────────────────────────────────────
  signalLegend: string;
  finalSignalLabel: string;
  signalCol: string;
  scoreCol: string;
  actionCol: string;
  strongBuyAction: string;
  buyAction: string;
  holdAction: string;
  sellAction: string;
  strongSellAction: string;
  categoryIconsLabel: string;
  iconCol: string;
  labelCol: string;
  disclaimer: string;
}
