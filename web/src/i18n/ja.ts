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
  footerDesc:
    'ティッカーで企業のポートフォリオや株価パフォーマンスをリサーチ。楽天証券の取引履歴を分析。',
  footerPrivacy:
    '🔒 ユーザーデータはサーバーに保存されません — すべての処理はブラウザ内で実行されます。',
  footerGithub: 'GitHub',
  footerLicense: 'MITライセンス',
  footerCopyright: (year) => `© ${year} anoff`,

  // ── Benchmark row ─────────────────────────────────────────────────────────
  referenceBenchmark: 'リファレンスベンチマーク:',

  // ── Outperformance chart ──────────────────────────────────────────────────
  outperformanceBreakdown: '📊 パフォーマンス分析',
  outperformanceDesc: (benchmark) =>
    `ベンチマークを上回った、または利益が出たポジションの割合（ポートフォリオ比率でも算出）。⏳ 保有期間3ヶ月未満のポジションを除く。ベンチマーク: ${benchmark}。`,
  tooltipOutperforming: 'アウトパフォーム',
  tooltipUnderperforming: 'アンダーパフォーム',
  tooltipProfitable: '利益あり',
  tooltipUnprofitable: '損失',
  barAlphaCagrCount: 'α CAGR\n(件数)',
  barAlphaCagrVolume: 'α CAGR\n(金額)',
  barCagrCount: 'CAGR\n(件数)',
  barCagrVolume: 'CAGR\n(金額)',

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
  signalLabels: {
    '⏳ Too Early':   '⏳ 保有期間短い',
    '🟢 Hold':        '🟢 保持',
    '🟣 Take Profit': '🟣 利益確定',
    '🔵 Buy More':    '🔵 追加購入',
    '🟡 Watch':       '🟡 注目',
    '🔴 Sell':        '🔴 売却',
  },

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
  tapToExpand: '行をタップして詳細を表示',

  // ── Research categories ───────────────────────────────────────────────────
  categoryNames: {
    Valuation: 'バリュエーション',
    Quality: '品質',
    Health: '財務健全性',
    Growth: '成長性',
    Momentum: 'モメンタム',
  },
  categoryAbbrevs: {
    Valuation: 'バリュ',
    Quality: '品質',
    Health: '健全',
    Growth: '成長',
    Momentum: '勢い',
  },

  // ── Research metrics ──────────────────────────────────────────────────────
  metricLabels: {
    trailingPE:              'PER（実績）',
    priceToBook:             'PBR',
    enterpriseToEbitda:      'EV/EBITDA',
    returnOnEquity:          'ROE',
    operatingMargins:        '営業利益率',
    grossMargins:            '売上総利益率',
    dividendYield:           '配当利回り',
    payoutRatio:             '配当性向',
    debtToEquity:            '負債資本比率',
    currentRatio:            '流動比率',
    fcfYield:                'FCF利回り',
    earningsQuarterlyGrowth: '四半期EPS成長率',
    revenueGrowth:           '売上成長率',
    recommendationScore:     'アナリスト推奨',
    alpha_best:              'アルファ（最良期間）',
    alpha_6m:                'アルファ 6ヶ月',
    cagr_best:               'CAGR（最良期間）',
    ret_6m:                  '6ヶ月リターン',
    ret_1m:                  '1ヶ月リターン',
  },
  metricDescriptions: {
    trailingPE:              '株価÷過去12ヶ月のEPS。低いほど収益に対して割安。',
    priceToBook:             '株価÷1株当たり純資産。低いほど資産価値に近い。',
    enterpriseToEbitda:      '企業価値÷EBITDA。低いほど営業利益に対して割安。',
    returnOnEquity:          '当期純利益÷自己資本。高いほど資本効率が良い。',
    operatingMargins:        '営業利益÷売上高。高いほど収益性が高い。',
    grossMargins:            '売上総利益÷売上高。高いほど製品経済性が良い。',
    dividendYield:           '年間配当÷株価。高いほど価格に対する収入が多い。',
    payoutRatio:             '配当÷利益。低いほど成長への再投資余地が大きい。',
    debtToEquity:            '総負債÷自己資本。低いほど財務レバレッジが少ない。',
    currentRatio:            '流動資産÷流動負債。高いほど短期流動性が良い。',
    fcfYield:                'フリーキャッシュフロー÷時価総額。高いほど割安。',
    earningsQuarterlyGrowth: '前年同期比の四半期EPS成長率。',
    revenueGrowth:           '前年比の売上成長率。',
    recommendationScore:     'アナリストコンセンサス（1=強い買い、5=売り）。低いほど強気。',
    alpha_best:              '最良の期間でのベンチマーク超過リターン。',
    alpha_6m:                '過去6ヶ月のベンチマーク超過リターン。',
    cagr_best:               '最良の期間での年平均成長率。',
    ret_6m:                  '過去6ヶ月の価格リターン。',
    ret_1m:                  '過去1ヶ月の価格リターン。',
  },

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
  labelAlphaVs: (window, benchmark) => `α ${window} vs ${benchmark}`,
  labelReturn6m: '6ヶ月リターン',
  labelReturn1m: '1ヶ月リターン',
  metricDetails: '指標詳細',
  colMetric: '指標',
  colRaw: '生の値',
  colNormalized: '正規化スコア',
  scoreStrong: '強い',
  scoreGood: '良い',
  scoreNeutral: '中立',
  scoreWeak: '弱い',
  scorePoor: '悪い',

  // ── Score chart ───────────────────────────────────────────────────────────
  scoresTitle: 'スコア',
  categoryBreakdown: 'カテゴリー内訳',
  finalScoreTitle: '最終スコア',

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
