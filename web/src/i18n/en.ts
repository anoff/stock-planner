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
  footerDesc:
    'Research company portfolio and stock performance via ticker. Analyze Rakuten trade history.',
  footerPrivacy:
    '🔒 No user data is stored on a server — all processing takes place locally in your browser.',
  footerGithub: 'GitHub',
  footerLicense: 'MIT License',
  footerCopyright: (year) => `© ${year} anoff`,

  // ── Benchmark row ─────────────────────────────────────────────────────────
  referenceBenchmark: 'Reference benchmark:',

  // ── Outperformance chart ──────────────────────────────────────────────────
  outperformanceBreakdown: '📊 Performance Breakdown',
  outperformanceDesc: (benchmark) =>
    `Share of positions (or portfolio volume) beating the benchmark / being profitable. Excludes ⏳ Too Early positions. Benchmark: ${benchmark}.`,
  tooltipOutperforming: 'Outperforming',
  tooltipUnderperforming: 'Underperforming',
  tooltipProfitable: 'Profitable',
  tooltipUnprofitable: 'Unprofitable',
  barAlphaCagrCount: 'α CAGR\n(count)',
  barAlphaCagrVolume: 'α CAGR\n(volume)',
  barCagrCount: 'CAGR\n(count)',
  barCagrVolume: 'CAGR\n(volume)',

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
  colPortfolioPct: 'Port. %',
  colScore: 'Score',
  colSignal: 'Signal',
  tooEarlyLabel:
    '⏳ Too Early — held <3 months, sorted by total return',
  closedPositionsGroupLabel:
    '⬛ Closed — fully sold positions, sorted by realized CAGR',
  signalLabels: {
    '⏳ Too Early':   '⏳ Too Early',
    '🟢 Hold':        '🟢 Hold',
    '🟣 Take Profit': '🟣 Take Profit',
    '🔵 Buy More':    '🔵 Buy More',
    '🟡 Watch':       '🟡 Watch',
    '🔴 Sell':        '🔴 Sell',
    '⬛ Closed':      '⬛ Closed',
  },

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
  showFullHistory: '📂 Full History',
  showActiveOnly: '📊 Active Only',

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
  tapToExpand: 'Tap any row to view details',

  // ── Research categories ───────────────────────────────────────────────────
  categoryNames: {
    Valuation: 'Valuation',
    Quality: 'Quality',
    Health: 'Health',
    Growth: 'Growth',
    Momentum: 'Momentum',
  },
  categoryAbbrevs: {
    Valuation: 'Val',
    Quality: 'Qual',
    Health: 'Health',
    Growth: 'Growth',
    Momentum: 'Mom',
  },
  categoryDescriptions: {
    Valuation: 'Is the stock cheap or expensive? Compares price to earnings, book value and cash flow. A low score means the market is asking a premium; a high score means you may be getting the business at a discount.',
    Quality:   'Is this a good business? Measures profitability (ROE, margins) and dividend sustainability. High-quality companies turn shareholder money into profit efficiently and can keep rewarding investors.',
    Health:    'Can the company handle hard times? Looks at debt levels and the ability to cover short-term bills. A healthy balance sheet means the company is unlikely to run into financial trouble if revenues dip.',
    Growth:    'Is the business getting bigger? Tracks earnings and revenue growth rates. Consistent growth signals expanding demand, pricing power, and a widening competitive moat.',
    Momentum:  'Has the stock been outperforming lately? Uses recent price returns vs the benchmark. Strong momentum means buyers are in control — often a sign that fundamentals are improving and the market is noticing.',
  },

  // ── Research metrics ──────────────────────────────────────────────────────
  metricLabels: {
    trailingPE:              'P/E (trailing)',
    priceToBook:             'Price / Book',
    enterpriseToEbitda:      'EV / EBITDA',
    returnOnEquity:          'Return on Equity',
    operatingMargins:        'Operating Margin',
    grossMargins:            'Gross Margin',
    dividendYield:           'Dividend Yield',
    payoutRatio:             'Payout Ratio',
    debtToEquity:            'Debt / Equity',
    currentRatio:            'Current Ratio',
    fcfYield:                'FCF Yield',
    earningsQuarterlyGrowth: 'Quarterly Earnings Growth',
    revenueGrowth:           'Revenue Growth',
    recommendationScore:     'Analyst Recommendation',
    alpha_best:              'Alpha (best window)',
    alpha_6m:                'Alpha 6M',
    cagr_best:               'CAGR (best window)',
    ret_6m:                  'Return 6M',
    ret_1m:                  'Return 1M',
  },
  metricDescriptions: {
    trailingPE:              'Price ÷ trailing 12-month EPS. If a stock earns $1/share and trades at $18, its P/E is 18×. Lower = you pay less for each dollar of earnings.',
    priceToBook:             'Price ÷ book value per share. Book value is assets minus debts — what shareholders would theoretically get if the company liquidated. Below 1× means you\'re buying $1 of net assets for less than $1.',
    enterpriseToEbitda:      'Enterprise value ÷ EBITDA (earnings before interest, taxes, depreciation). Like P/E but debt-aware and strips out accounting noise. Lower = cheaper relative to operating profit.',
    returnOnEquity:          'Net income ÷ shareholders\' equity. How efficiently does the company turn investors\' money into profit? A 20% ROE means every $100 of equity generated $20 in profit.',
    operatingMargins:        'Operating profit ÷ revenue. Out of every $100 in sales, how much is left after paying employees and running costs (before taxes)? Higher = leaner, more profitable operations.',
    grossMargins:            'Gross profit ÷ revenue. Out of every $100 in sales, how much is left after raw production costs? High gross margins signal strong pricing power and room to invest in growth.',
    dividendYield:           'Annual dividend ÷ stock price. A stock paying $2/year that costs $40 has a 5% yield. Higher = more cash income relative to what you paid.',
    payoutRatio:             'Dividends paid ÷ earnings. If the company earns $1/share and pays $0.40, payout = 40%. Lower means more earnings kept for reinvestment and future growth.',
    debtToEquity:            'Total debt ÷ equity. How much is the company financed by borrowing vs its own money? A ratio of 200% means twice as much debt as equity — riskier if business slows.',
    currentRatio:            'Current assets ÷ current liabilities. Can the company pay all bills due in the next 12 months? Above 1 = yes. Below 1 could signal a cash squeeze.',
    fcfYield:                'Free cash flow ÷ market cap. FCF is profit minus the cash needed to keep the business running. Higher yield = more real cash generated relative to the stock price — hard to fake.',
    earningsQuarterlyGrowth: 'Quarterly earnings growth vs the same quarter last year. Accelerating growth here suggests the business is on an upswing.',
    revenueGrowth:           'Revenue growth vs last year. Growing sales show customers are buying more — the foundation for sustainable long-term profit growth.',
    recommendationScore:     'Average analyst rating (1 = Strong Buy, 5 = Sell). Consensus from professionals who research this company full-time. Lower = more bullish overall.',
    alpha_best:              'Excess return vs benchmark over the best available time window. Positive alpha means the stock beat the market index over that period.',
    alpha_6m:                'Excess return vs benchmark over the past 6 months. Positive = outperforming the index lately.',
    cagr_best:               'Compound annual growth rate over the best available window — how fast the stock grew per year as if it grew at a steady pace the whole time.',
    ret_6m:                  'Total price change over the past 6 months. Simple return, not annualized.',
    ret_1m:                  'Total price change over the past month. Short-term momentum signal.',
  },

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
  labelAlphaVs: (window, benchmark) => `α ${window} vs ${benchmark}`,
  labelReturn6m: 'Return 6M',
  labelReturn1m: 'Return 1M',
  metricDetails: 'Metric Details',
  colMetric: 'Metric',
  colRaw: 'Raw',
  colNormalized: 'Normalized',
  scoreStrong: 'Strong',
  scoreGood: 'Good',
  scoreNeutral: 'Neutral',
  scoreWeak: 'Weak',
  scorePoor: 'Poor',

  // ── Score chart ───────────────────────────────────────────────────────────
  scoresTitle: 'Scores',
  categoryBreakdown: 'Category Breakdown',
  finalScoreTitle: 'Final Score',

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
