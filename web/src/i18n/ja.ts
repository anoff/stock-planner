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
  colPortfolioPct: '比率',
  colScore: 'スコア',
  colSignal: 'シグナル',
  tooEarlyLabel:
    '⏳ 保有期間3ヶ月未満 — 総リターン順',
  closedPositionsGroupLabel:
    '⬛ 決済済み — 全売却済みポジション、実現CAGR順',
  signalLabels: {
    '⏳ Too Early':   '⏳ 保有期間短い',
    '🟢 Hold':        '🟢 保持',
    '🟣 Take Profit': '🟣 利益確定',
    '🔵 Buy More':    '🔵 追加購入',
    '🟡 Watch':       '🟡 注目',
    '🔴 Sell':        '🔴 売却',
    '⬛ Closed':      '⬛ 決済済み',
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
  showFullHistory: '📂 全履歴',
  showActiveOnly: '📊 アクティブのみ',

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
  categoryDescriptions: {
    Valuation: '株価は割安か割高か？PER・PBR・キャッシュフローと比較します。スコアが低いほど市場がプレミアムを要求しており、高いほど割安で購入できる可能性があります。',
    Quality:   '優れたビジネスか？ROEや利益率など収益性と配当の持続性を測ります。高品質な企業は株主資本を効率よく利益に変え、長期的に投資家へ還元できます。',
    Health:    '困難な時期を乗り越えられるか？負債水準と短期的な支払い能力を確認します。財務が健全な企業は、売上が落ちても財務危機に陥るリスクが低いです。',
    Growth:    'ビジネスは拡大しているか？利益と売上の成長率を追跡します。継続的な成長は需要の拡大・価格決定力・競争優位の広がりを示します。',
    Momentum:  '最近、株価は市場を上回っているか？ベンチマークとの直近リターンを比較します。強いモメンタムは買い手優勢のサインで、ファンダメンタルズ改善を市場が認識し始めた可能性を示します。',
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
    trailingPE:              '株価÷過去12ヶ月のEPS。1株利益100円の株が1800円なら、PERは18倍。低いほど実際の利益に対して割安。',
    priceToBook:             '株価÷1株あたり純資産（BPS）。純資産とは資産から負債を引いた正味財産。1倍未満は純資産以下の価格で買えることを意味する。',
    enterpriseToEbitda:      '企業価値÷EBITDA（利払前・税引前・償却前利益）。PERに似ているが、負債を考慮しつつ会計上のノイズを排除。低いほど営業利益に対して割安。',
    returnOnEquity:          '当期純利益÷自己資本。株主の資金をどれだけ効率よく利益に変えているか。ROE20%は自己資本100円につき20円の利益を意味する。',
    operatingMargins:        '営業利益÷売上高。売上100円のうち、人件費や運営コスト（税金除く）を引いた後にいくら残るか。高いほど収益性が高い。',
    grossMargins:            '売上総利益÷売上高。売上100円のうち、製造・仕入コストを除いた後に残る額。高いほど価格決定力があり成長への投資余力も大きい。',
    dividendYield:           '年間配当÷株価。株価1000円で年間配当50円なら利回り5%。高いほど投資額に対する現金収入が多い。',
    payoutRatio:             '配当÷利益。1株利益100円で配当40円なら配当性向40%。低いほど利益を成長のための再投資に回せる余地が大きい。',
    debtToEquity:            '総負債÷自己資本。会社がどれだけ借金に依存しているかを示す。200%は自己資本の2倍の負債があることを意味し、業績悪化時のリスクが高まる。',
    currentRatio:            '流動資産÷流動負債。1年以内に支払う義務のある負債を、1年以内に換金できる資産で賄えるか。1倍以上なら安全。1倍未満は資金繰りリスクのサイン。',
    fcfYield:                'フリーキャッシュフロー÷時価総額。FCFは事業維持コストを除いた実質的な現金利益。利回りが高いほど株価に対してより多くの「本物の」キャッシュを生んでいる。',
    earningsQuarterlyGrowth: '前年同期比の四半期EPS成長率。高い伸びはビジネスが加速していることを示す。',
    revenueGrowth:           '前年比の売上成長率。売上の増加は顧客がより多く買っていることを示し、長期的な利益成長の基盤となる。',
    recommendationScore:     'アナリストの平均レーティング（1＝強い買い、5＝売り）。その企業を専門的に調査したアナリストの総意。低いほど強気な評価。',
    alpha_best:              '最も良いパフォーマンスを示した期間でのベンチマーク超過リターン。プラスなら市場平均を上回っていることを意味する。',
    alpha_6m:                '過去6ヶ月のベンチマーク超過リターン。プラスなら直近でアウトパフォームしている。',
    cagr_best:               '最良の期間での年平均成長率。毎年一定率で成長したと仮定した場合の年率換算リターン。',
    ret_6m:                  '過去6ヶ月の株価変動率。単純な価格リターン（年率換算なし）。',
    ret_1m:                  '過去1ヶ月の株価変動率。短期モメンタムを示す指標。',
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
