import { useCallback, useEffect, useRef, useState } from "react";
import DropZone from "./components/DropZone";
import MetricsTable from "./components/MetricsTable";
import ScatterPlot from "./components/ScatterPlot";
import Summary from "./components/Summary";
import ResearchPage from "./components/ResearchPage";
import PositionChart from "./components/PositionChart";
import OutperformanceChart from "./components/OutperformanceChart";
import StockDetail from "./components/StockDetail";
import RealizedSummary from "./components/RealizedSummary";
import RealizedTable from "./components/RealizedTable";
import { fetchPriceData } from "./utils/prices";
import {
  aggregatePositions,
  calculateMetrics,
  closedToMetrics,
  computeClosedPositions,
  computeRealizedEntries,
  getBenchmarkTicker,
} from "./utils/metrics";
import { fetchAndComputeResearchResult } from "./utils/research";
import type { ResearchResult } from "./utils/research";
import type { ClosedPosition, PositionMetrics, PriceData, RealizedEntry, Trade } from "./utils/types";
import { BENCHMARK_OPTIONS } from "./utils/types";
import { ThemeContext, CHART_COLORS } from "./theme";
import type { Theme } from "./theme";
import { LanguageContext, loadLanguage, saveLanguage, LANGUAGES } from "./i18n";
import type { Language } from "./i18n";
import "./App.css";

type Tab = "research" | "portfolio";

type AppState =
  | { stage: "idle" }
  | { stage: "fetching"; progress: number; total: number }
  |     {
      stage: "done";
      metrics: PositionMetrics[];
      closed: ClosedPosition[];
      realized: RealizedEntry[];
      priceData: PriceData;
      trades: Trade[];
      tradeCount: number;
      warnings: string[];
      baseCurrency: "EUR" | "JPY";
    }
  | { stage: "error"; message: string };

const CHART_RANGE_MS: Record<"5y" | "3y" | "1y" | "6m" | "1m", number> = {
  "5y": 5 * 365 * 24 * 60 * 60 * 1000,
  "3y": 3 * 365 * 24 * 60 * 60 * 1000,
  "1y": 365 * 24 * 60 * 60 * 1000,
  "6m": 180 * 24 * 60 * 60 * 1000,
  "1m": 30 * 24 * 60 * 60 * 1000,
};

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("research");
  const [state, setState] = useState<AppState>({ stage: "idle" });
  const [benchmarkTicker, setBenchmarkTicker] = useState(getBenchmarkTicker());
  const [showDetailCharts, setShowDetailCharts] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showRealized, setShowRealized] = useState(true);
  const [chartRange, setChartRange] = useState<"5y" | "3y" | "1y" | "6m" | "1m">("5y");
  const [rangeStart, setRangeStart] = useState<Date>(
    () => new Date(Date.now() - CHART_RANGE_MS["5y"])
  );

  // ── Per-position research detail state (Rakuten Analysis tab) ─────────────
  // selectedAnalysisTicker: which row is currently expanded
  // analysisDetailStates: session cache mapping yfTicker → loading/done/error
  const [selectedAnalysisTicker, setSelectedAnalysisTicker] = useState<string | null>(null);
  const [analysisDetailStates, setAnalysisDetailStates] = useState<
    Record<string, { status: "loading" } | { status: "done"; result: ResearchResult } | { status: "error"; message: string }>
  >({});
  // Ref to prevent double-fetching the same ticker on rapid clicks
  const inflightDetailFetches = useRef(new Set<string>());

  // ── Theme ────────────────────────────────────────────────────────
  const systemDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [theme, setTheme] = useState<Theme>(systemDark ? "dark" : "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  // ── Language ─────────────────────────────────────────────────────
  const [language, setLanguage] = useState<Language>(loadLanguage);
  const t = LANGUAGES[language];

  const toggleLanguage = () =>
    setLanguage((l) => {
      const next: Language = l === "en" ? "ja" : "en";
      saveLanguage(next);
      return next;
    });

  // ── Mask values ──────────────────────────────────────────────────
  const [maskValues, setMaskValues] = useState(false);
  const toggleMaskValues = () => setMaskValues((v) => !v);

  // ── Shared pipeline: positions → prices → metrics ────────────
  const processTrades = useCallback(
    async (allTrades: Trade[], baseCurrency: "EUR" | "JPY") => {
      // Reset per-position research detail when a new analysis starts
      setSelectedAnalysisTicker(null);
      setAnalysisDetailStates({});
      inflightDetailFetches.current.clear();

      const buyTrades = allTrades.filter((trade) => trade.side === "buy");
      if (buyTrades.length === 0) {
        setState({ stage: "error", message: t.noBuyTrades });
        return;
      }

      const tickers = [
        ...new Set(
          buyTrades.map((trade) => trade.yfTicker).filter((ticker) => ticker !== "")
        ),
        benchmarkTicker,
        // Always fetch USD/JPY so metrics.ts can convert Rakuten US stock
        // current values from USD to JPY at the latest available rate.
        "USDJPY=X",
        // For DAB bank portfolios (EUR base) also fetch EUR/USD, EUR/JPY and
        // EUR/GBP so metrics.ts can convert US, Japanese and LSE-listed stock
        // prices to EUR.  LSE tickers (*.L) are quoted in GBp (pence), so the
        // GBP rate is required to convert them correctly.
        ...(baseCurrency === "EUR" ? ["EURUSD=X", "EURJPY=X", "EURGBP=X"] : []),
      ];

      setState({ stage: "fetching", progress: 0, total: tickers.length });

      const { data: priceData, failed: failedPrices } = await fetchPriceData(tickers, (done, total) => {
        setState({ stage: "fetching", progress: done, total });
      });

      const positions = aggregatePositions(allTrades, priceData);
      const metrics = calculateMetrics(positions, priceData, benchmarkTicker);
      const closed = computeClosedPositions(allTrades);
      const realized = computeRealizedEntries(allTrades, priceData, benchmarkTicker);

      if (metrics.length === 0 && closed.length === 0) {
        setState({
          stage: "error",
          message: t.noMetrics,
        });
        return;
      }

      const warnings: string[] = [];
      if (failedPrices.length > 0) {
        warnings.push(t.pricesUnavailableFor(failedPrices.join(", ")));
      }

      setState({
        stage: "done",
        metrics,
        closed,
        realized,
        priceData,
        trades: allTrades,
        tradeCount: buyTrades.length,
        warnings,
        baseCurrency: baseCurrency,
      });
    },
    [benchmarkTicker, t]
  );

  const handleAnalyze = useCallback(
    async (trades: Trade[], baseCurrency: "EUR" | "JPY") => {
      await processTrades(trades, baseCurrency);
    },
    [processTrades]
  );

  /**
   * Called when the user clicks a row in MetricsTable to expand/collapse the
   * per-position research detail panel. Fetches fundamentals on demand (first
   * click) and caches the result for the rest of the session.
   */
  const handleSelectAnalysisTicker = useCallback(
    async (ticker: string | null) => {
      setSelectedAnalysisTicker((prev) => (prev === ticker ? null : ticker));
      if (!ticker || state.stage !== "done") return;

      // Skip if we already have data or a fetch is in flight
      if (analysisDetailStates[ticker] || inflightDetailFetches.current.has(ticker)) return;

      inflightDetailFetches.current.add(ticker);
      setAnalysisDetailStates((prev) => ({ ...prev, [ticker]: { status: "loading" } }));

      const priceData = state.priceData;
      const bm = benchmarkTicker;
      try {
        const result = await fetchAndComputeResearchResult(ticker, priceData, bm);
        setAnalysisDetailStates((prev) => ({
          ...prev,
          [ticker]: result
            ? { status: "done", result }
            : { status: "error", message: t.loadingDetailFailed },
        }));
      } catch (err) {
        setAnalysisDetailStates((prev) => ({
          ...prev,
          [ticker]: {
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          },
        }));
      } finally {
        inflightDetailFetches.current.delete(ticker);
      }
    },
    [analysisDetailStates, benchmarkTicker, state, t]
  );

  const benchmarkName =
    BENCHMARK_OPTIONS.find((b) => b.ticker === benchmarkTicker)?.name ??
    benchmarkTicker;

  const currentYear = new Date().getFullYear();

  return (
    <LanguageContext.Provider value={{ language, t, toggleLanguage }}>
    <ThemeContext.Provider value={{ theme, chart: CHART_COLORS[theme], toggleTheme, maskValues, toggleMaskValues }}>
      <a
        href="https://github.com/anoff/stock-planner"
        className="github-corner"
        aria-label="View source on GitHub"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 250 250"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z" />
          <path
            d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2"
            fill="currentColor"
            className="github-corner-arm"
          />
          <path
            d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.7,65.4 C194.3,69.0 197.4,73.2 199.8,77.6 C213.5,80.3 215.9,85.0 215.9,85.0 C212.5,93.2 206.7,96.1 205.1,96.6 C204.9,102.4 202.6,107.8 198.1,112.2 C181.9,128.4 168.3,122.0 157.7,113.7 C156.6,114.9 155.8,116.3 155.8,117.8 L155.8,134.9 C155.8,138.7 153.5,142.0 150.4,143.4 L111.9,162.7 C108.0,164.6 103.4,163.2 101.5,159.3 L83.6,121.8 C81.7,117.9 83.1,113.3 87.0,111.4 Z"
            fill="currentColor"
          />
        </svg>
      </a>
      <div className="app">
        <header className="app-header">
          <h1>{t.appTitle}</h1>
          <nav className="app-tabs">
            <button
              className={`app-tab${activeTab === "research" ? " app-tab--active" : ""}`}
              onClick={() => setActiveTab("research")}
            >
              {t.tabResearch}
            </button>
            <button
              className={`app-tab${activeTab === "portfolio" ? " app-tab--active" : ""}`}
              onClick={() => setActiveTab("portfolio")}
            >
              {t.tabPortfolio}
            </button>
          </nav>
          {activeTab === "research" && (
            <p>{t.descResearch}</p>
          )}
          {activeTab === "portfolio" && (
            <p>{t.descPortfolio(benchmarkName)}</p>
          )}
          <div className="header-controls">
            <button
              className={`mask-values-toggle${maskValues ? " mask-values-toggle--active" : ""}`}
              onClick={toggleMaskValues}
              aria-label={maskValues ? t.showValues : t.hideValues}
              title={maskValues ? t.showValues : t.hideValues}
            >
              {maskValues ? "🙈" : "👁"} {maskValues ? t.showValues : t.hideValues}
            </button>
            <button
              className="lang-toggle"
              onClick={toggleLanguage}
              title={language === "en" ? t.switchToJapanese : t.switchToEnglish}
              aria-label={language === "en" ? t.switchToJapanese : t.switchToEnglish}
            >
              {language === "en" ? "🇯🇵" : "🇺🇸"}
            </button>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={theme === "dark" ? t.switchToLight : t.switchToDark}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
          </div>
        </header>

        {activeTab === "research" && <ResearchPage />}

        {activeTab === "portfolio" && (
          <>
            {state.stage === "idle" && (
              <>
                <div className="benchmark-row">
                  <label htmlFor="benchmark-select">{t.referenceBenchmark}</label>
                  <select
                    id="benchmark-select"
                    className="styled-select"
                    value={benchmarkTicker}
                    onChange={(e) => setBenchmarkTicker(e.target.value)}
                  >
                    {BENCHMARK_OPTIONS.map((b) => (
                      <option key={b.ticker} value={b.ticker}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <DropZone onAnalyze={handleAnalyze} />
              </>
            )}

            {state.stage === "fetching" && (
              <div className="status">
                <div>{t.fetchingPrices(state.progress, state.total)}</div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(state.progress / state.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {state.stage === "error" && (
              <div className="error">
                <p>{state.message}</p>
                <button onClick={() => setState({ stage: "idle" })}>{t.tryAgain}</button>
              </div>
            )}

            {state.stage === "done" && (
              <>
                {state.warnings.length > 0 && (
                  <div className="warning">
                    {state.warnings.map((w, i) => <p key={i}>{w}</p>)}
                  </div>
                )}

                <div style={{ textAlign: "center", margin: "20px 0 4px" }}>
                  <button
                    className="btn"
                    onClick={() => {
                      setState({ stage: "idle" });
                      setSelectedAnalysisTicker(null);
                      setAnalysisDetailStates({});
                      inflightDetailFetches.current.clear();
                    }}
                  >
                    {t.loadNewFiles}
                  </button>
                </div>

                {/* History toggle — only show when there are closed positions */}
                {state.closed.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 4px" }}>
                    <button
                      className={`history-toggle${showFullHistory ? " history-toggle--active" : ""}`}
                      onClick={() => setShowFullHistory((v) => !v)}
                      title={showFullHistory ? t.showActiveOnly : t.showFullHistory}
                    >
                      {showFullHistory ? t.showActiveOnly : t.showFullHistory}
                    </button>
                  </div>
                )}

                {(() => {
                  const displayMetrics: PositionMetrics[] = showFullHistory
                    ? [
                        ...state.metrics,
                        ...closedToMetrics(state.closed, state.priceData, benchmarkTicker),
                      ]
                    : state.metrics;

                  return (
                    <>
                      <Summary metrics={displayMetrics} benchmark={benchmarkName} baseCurrency={state.baseCurrency} />

                      <OutperformanceChart metrics={displayMetrics} benchmark={benchmarkName} />

                       <MetricsTable
                         metrics={displayMetrics}
                         benchmark={benchmarkName}
                         baseCurrency={state.baseCurrency}
                         onSelectTicker={handleSelectAnalysisTicker}
                         selectedTicker={selectedAnalysisTicker}
                       />

                      {/* Per-position research detail panel — on-demand, cached per session */}
                      {selectedAnalysisTicker && (() => {
                        const detailState = analysisDetailStates[selectedAnalysisTicker];
                        if (!detailState || detailState.status === "loading") {
                          return (
                            <div className="status" style={{ margin: "8px 0 24px" }}>
                              {t.loadingDetail}
                            </div>
                          );
                        }
                        if (detailState.status === "error") {
                          return (
                            <div className="warning" style={{ margin: "8px 0 24px" }}>
                              <p>{t.loadingDetailFailed}</p>
                              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{detailState.message}</p>
                            </div>
                          );
                        }
                        return (
                          <StockDetail
                            result={detailState.result}
                            priceHistory={state.priceData[selectedAnalysisTicker]}
                            buyDates={[
                              ...state.trades.filter((tr) => tr.side === "buy" && tr.yfTicker === selectedAnalysisTicker).map((tr) => tr.date),
                              ...state.closed.filter((p) => p.yfTicker === selectedAnalysisTicker).flatMap((p) => p.buyDates),
                            ]}
                            sellDates={[
                              ...state.trades.filter((tr) => tr.side === "sell" && tr.yfTicker === selectedAnalysisTicker).map((tr) => tr.date),
                              ...state.closed.filter((p) => p.yfTicker === selectedAnalysisTicker).flatMap((p) => p.sellDates),
                            ]}
                            onClose={() => setSelectedAnalysisTicker(null)}
                          />
                        );
                      })()}

                      <ScatterPlot metrics={displayMetrics} />

                      {/* Individual position charts */}
                      {displayMetrics.length > 0 && (
                        <div style={{ margin: "32px 0" }}>
                          <div className="section-title">
                            {t.positionHistoryCharts}
                          </div>
                          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "-8px 0 14px" }}>
                            {t.chartLegendText}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                            <button
                              className={`btn${showDetailCharts ? " btn-active" : ""}`}
                              onClick={() => setShowDetailCharts((v) => !v)}
                            >
                              {showDetailCharts ? t.hideCharts : t.showCharts}
                            </button>
                            {showDetailCharts && (
                              <div style={{ display: "flex", gap: 4 }}>
                                {(["5y", "3y", "1y", "6m", "1m"] as const).map((r) => (
                                  <button
                                    key={r}
                                    className={`btn btn-sm${chartRange === r ? " btn-active" : ""}`}
                                    onClick={() => {
                                      setChartRange(r);
                                      setRangeStart(new Date(Date.now() - CHART_RANGE_MS[r]));
                                    }}
                                  >
                                    {r}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {showDetailCharts && (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
                                gap: 16,
                              }}
                            >
                              {/* Active position charts */}
                              {state.metrics.map((m) => {
                                const buyTrades = state.trades.filter(
                                  (t) => t.side === "buy" && t.yfTicker === m.yfTicker
                                );
                                const sellTrades = state.trades.filter(
                                  (t) => t.side === "sell" && t.yfTicker === m.yfTicker
                                );
                                return (
                                  <div key={m.yfTicker} className="chart-card">
                                    <PositionChart
                                      name={m.name}
                                      ticker={m.yfTicker}
                                      priceHistory={state.priceData[m.yfTicker] ?? []}
                                      buyDates={buyTrades.map((t) => t.date)}
                                      sellDates={sellTrades.map((t) => t.date)}
                                      startDate={rangeStart}
                                    />
                                  </div>
                                );
                              })}
                              {/* Closed position separator + charts (full history mode) */}
                              {showFullHistory && state.closed.length > 0 && (
                                <div
                                  style={{
                                    gridColumn: "1 / -1",
                                    padding: "5px 12px",
                                    backgroundColor: "var(--accent-surface)",
                                    color: "var(--text-muted)",
                                    fontSize: 11,
                                    fontStyle: "italic",
                                    borderTop: "2px solid var(--border-strong)",
                                    borderRadius: 4,
                                  }}
                                >
                                  {t.closedPositionsGroupLabel}
                                </div>
                              )}
                              {showFullHistory && state.closed.map((p) => (
                                <div
                                  key={`closed-${p.yfTicker}-${p.lastSellDate.getTime()}`}
                                  className="chart-card"
                                  style={{ opacity: 0.75 }}
                                >
                                  <PositionChart
                                    name={p.name}
                                    ticker={p.yfTicker}
                                    priceHistory={state.priceData[p.yfTicker] ?? []}
                                    buyDates={p.buyDates}
                                    sellDates={p.sellDates}
                                    startDate={new Date(p.firstBuyDate.getTime() - 30 * 24 * 60 * 60 * 1000)}
                                    endDate={new Date(p.lastSellDate.getTime() + 30 * 24 * 60 * 60 * 1000)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* ── Realized P&L section ─────────────────────────── */}
                {state.realized.length > 0 && (
                  <div style={{ margin: "32px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div className="section-title" style={{ margin: 0 }}>
                        {t.realizedSectionTitle}
                      </div>
                      <button
                        className={`btn${showRealized ? " btn-active" : ""}`}
                        onClick={() => setShowRealized((v) => !v)}
                      >
                        {showRealized ? t.hide : t.show}
                      </button>
                    </div>
                    {showRealized && (
                      <>
                        <RealizedSummary
                          entries={state.realized}
                          baseCurrency={state.baseCurrency}
                        />
                        <RealizedTable
                          entries={state.realized}
                          benchmark={benchmarkName}
                          baseCurrency={state.baseCurrency}
                        />
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        <footer className="app-footer">
          <p className="app-footer-desc">{t.footerDesc}</p>
          <p className="app-footer-privacy">{t.footerPrivacy}</p>
          <p className="app-footer-links">
            <a
              href="https://github.com/anoff/stock-planner"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.footerGithub}
            </a>
            {" · "}
            <a
              href="https://github.com/anoff/stock-planner/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.footerLicense}
            </a>
          </p>
          <p className="app-footer-copy">{t.footerCopyright(currentYear)}</p>
        </footer>
      </div>
    </ThemeContext.Provider>
    </LanguageContext.Provider>
  );
}

export default App;
