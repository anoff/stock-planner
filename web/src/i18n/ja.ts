import type { Translations } from './translations';

const ja: Translations = {
  // ── App shell ──────────────────────────────────────────────────────────────
  appTitle: 'ストックプランナー',
  tabResearch: 'リサーチ',
  tabPortfolio: '楽天証券分析',
  descResearch:
    'ティッカーを入力して、バリュエーション・品質・財務健全性・成長性・モメンタムのスコアを含む定量的リサーチレポートを取得します。',
  descPortfolio: (benchmark) =>
    `楽天証券のCSVをドロップして、${benchmark}とのパフォーマンスを分析します`,

  // ── Header controls ────────────────────────────────────────────────────────
  showValues: '表示する',
  hideValues: '非表示にする',
  switchToLight: 'ライトモードに切替',
  switchToDark: 'ダークモードに切替',
  switchToJapanese: '日本語に切替',
  switchToEnglish: '英語に切替',

  // ── Fetching / progress ────────────────────────────────────────────────────
  fetchingPrices: (done, total) => `株価データを取得中… ${done}/${total}`,
  fetchingFundamentals: (done, total) =>
    `ファンダメンタル情報を取得中… ${done}/${total}`,

  // ── Error / warning messages ───────────────────────────────────────────────
  noBuyTrades: '買い取引が見つかりません。',
  noMetrics:
    'ポジションのメトリクスを計算できませんでした。株価データが利用できない可能性があります。',
  noPriceData:
    '株価データを取得できませんでした。ティッカーとネットワーク接続を確認してください。',
  noResults:
    '結果なし — 指定されたティッカーの株価データが利用できない可能性があります。',
  tryAgain: '再試行',
  pricesUnavailableFor: (tickers) => `株価データが利用できません: ${tickers}`,
  fundamentalsUnavailableFor: (tickers) =>
    `ファンダメンタルデータが利用できません: ${tickers} — 株価指標のみに基づくスコア`,

  // ── Portfolio results ──────────────────────────────────────────────────────
  loadNewFiles: '↩ 新しいファイルを読み込む',
  positionHistoryCharts: '📉 ポジション履歴チャート',
  chartLegendText: '株価時系列（B = 買い、S = 売りのマーカー付き）。',
  hideCharts: 'チャートを隠す',
  showCharts: '📈 チャートを表示',
  footer:
    'データはYahoo Financeより。すべての計算はブラウザで実行されます。',

  // ── Summary card ──────────────────────────────────────────────────────────
  portfolioSummary: '📋 ポートフォリオサマリー',
  labelPositions: 'ポジション数',
  labelTotalProfit: '総利益',
  labelTotalReturn: '総リターン',
  labelPortfolioAlpha: 'ポートフォリオアルファ',
  outperforming: (pct, benchmark) =>
    `${Math.round(pct * 100)}%が${benchmark}をアウトパフォーム`,

  // ── Metrics table ─────────────────────────────────────────────────────────
  positionMetrics: '📊 ポジションメトリクス',
  colName: '銘柄名',
  colProfit: '利益',
  colTicker: 'ティッカー',
  colCagr: 'CAGR',
  colAlphaCagr: 'α CAGR',
  col1m: '1ヶ月',
  col6m: '6ヶ月',
  colTotalReturn: '総リターン',
  colDaysHeld: '保有日数',
  colScore: 'スコア',
  colSignal: 'シグナル',
  tooEarlyLabel:
    '⏳ 保有期間3ヶ月未満 — 総リターン順',

  // ── Drop zone ─────────────────────────────────────────────────────────────
  dropHere: '楽天証券のCSVをここにドロップ',
  dropMoreFiles: 'ファイルをドロップするか参照して追加',
  dropHint:
    'JP・US・ファンドCSVの混在が可能 — ファイル間の重複は自動的に除去されます',
  browseFiles: 'ファイルを参照',
  fixErrorsBeforeAnalyzing: '分析前にエラーを修正してください',
  dropTradesSuffix: '件の取引',
  dropTradeSeparator: ' · ',
  dropPositionSuffix: () => '銘柄',
  analyzeBtn: '分析する →',
  removeFile: 'ファイルを削除',
  errorBadge: 'エラー',
  tradesBadge: (n) => `${n}件の取引`,

  // ── Closed positions ──────────────────────────────────────────────────────
  closedPositions: (n) => `🗂️ 決済済みポジション (${n})`,
  hide: '▲ 隠す',
  show: '▼ 表示',
  colFirstBuy: '最初の購入',
  colLastSell: '最後の売却',

  // ── Ticker input ──────────────────────────────────────────────────────────
  labelTickers: 'ティッカー',
  labelBenchmark: 'ベンチマーク',
  analyzing: '読み込み中…',
  analyze: '分析する',
  tickerInputHint:
    'カンマまたはスペース区切りのYahoo Financeティッカー。5年間の株価履歴とファンダメンタルデータを取得します。',

  // ── Research overview ─────────────────────────────────────────────────────
  overview: '概要',
  colCcy: '通貨',
  colCagr5y: '5年CAGR',
  colCagr3y: '3年CAGR',
  colCagr1y: '1年CAGR',
  colAlpha1y: 'α 1年',
  col6mShort: '6ヶ月',
  col1mShort: '1ヶ月',
  signalWithAbbrevs: (abbrevs) => `シグナル (${abbrevs})`,
  clickToExpand: 'クリックして詳細を表示',

  // ── Stock detail ──────────────────────────────────────────────────────────
  priceUnavailable: '株価が利用できません',
  closeOf: (date) => `${date}の終値`,
  vetoOverride: '拒否権オーバーライド:',
  scoringBreakdown: 'スコア内訳',
  colCategory: 'カテゴリー',
  colLabel: 'ラベル',
  finalLabel: '合計',
  pricePerformance: '株価 & パフォーマンス',
  dataAvailable: '利用可能なデータ',
  months: 'ヶ月',
  metricDetails: '指標詳細',
  colMetric: '指標',
  colRaw: '生の値',
  colNormalized: '正規化スコア',
  scoreStrong: '強い',
  scoreGood: '良い',
  scoreNeutral: '中立',
  scoreWeak: '弱い',
  scorePoor: '悪い',

  // ── Research legend ───────────────────────────────────────────────────────
  signalLegend: 'シグナル凡例',
  finalSignalLabel: '最終シグナル',
  signalCol: 'シグナル',
  scoreCol: 'スコア',
  actionCol: 'アクション',
  strongBuyAction: '高い確信の買い',
  buyAction: '買いを検討',
  holdAction: '様子見、アクション不要',
  sellAction: '保有を検討から外す',
  strongSellAction: '回避',
  categoryIconsLabel: 'カテゴリーアイコン',
  iconCol: 'アイコン',
  labelCol: 'ラベル',
  disclaimer:
    'データはYahoo Financeよりyahoo-finance2経由。株価は分割・配当修正済み終値。6M/1Mウィンドウ = 180/30暦日；両端は直前の取引日終値を使用。ファンダメンタルデータはベストエフォートであり、一部のティッカーでは利用できない場合があります。',
};

export default ja;
