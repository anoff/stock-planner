import { useCallback, useEffect, useState } from "react";
import DropZone from "./components/DropZone";
import MetricsTable from "./components/MetricsTable";
import ScatterPlot from "./components/ScatterPlot";
import Summary from "./components/Summary";
import ResearchPage from "./components/ResearchPage";
import PositionChart from "./components/PositionChart";
import ClosedPositions from "./components/ClosedPositions";
import OutperformanceChart from "./components/OutperformanceChart";
import { fetchPriceData } from "./utils/prices";
import {
  aggregatePositions,
  calculateMetrics,
  computeClosedPositions,
  getBenchmarkTicker,
} from "./utils/metrics";
import type { ClosedPosition, PositionMetrics, PriceData, Trade } from "./utils/types";
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
  | {
      stage: "done";
      metrics: PositionMetrics[];
      closed: ClosedPosition[];
      priceData: PriceData;
      trades: Trade[];
      tradeCount: number;
      warnings: string[];
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
  const [chartRange, setChartRange] = useState<"5y" | "3y" | "1y" | "6m" | "1m">("5y");
  const [rangeStart, setRangeStart] = useState<Date>(
    () => new Date(Date.now() - CHART_RANGE_MS["5y"])
  );

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
    async (allTrades: Trade[]) => {
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
      ];

      setState({ stage: "fetching", progress: 0, total: tickers.length });

      const { data: priceData, failed: failedPrices } = await fetchPriceData(tickers, (done, total) => {
        setState({ stage: "fetching", progress: done, total });
      });

      const positions = aggregatePositions(allTrades, priceData);
      const metrics = calculateMetrics(positions, priceData, benchmarkTicker);
      const closed = computeClosedPositions(allTrades);

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
        priceData,
        trades: allTrades,
        tradeCount: buyTrades.length,
        warnings,
      });
    },
    [benchmarkTicker, t]
  );

  const handleAnalyze = useCallback(
    async (trades: Trade[]) => {
      await processTrades(trades);
    },
    [processTrades]
  );

  const benchmarkName =
    BENCHMARK_OPTIONS.find((b) => b.ticker === benchmarkTicker)?.name ??
    benchmarkTicker;

  return (
    <LanguageContext.Provider value={{ language, t, toggleLanguage }}>
    <ThemeContext.Provider value={{ theme, chart: CHART_COLORS[theme], toggleTheme, maskValues, toggleMaskValues }}>
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
                    onClick={() => setState({ stage: "idle" })}
                  >
                    {t.loadNewFiles}
                  </button>
                </div>

                <Summary metrics={state.metrics} benchmark={benchmarkName} />

                <OutperformanceChart metrics={state.metrics} benchmark={benchmarkName} />

                <MetricsTable
                  metrics={state.metrics}
                  benchmark={benchmarkName}
                />

                <ScatterPlot metrics={state.metrics} />

                {/* Individual position charts */}
                {state.metrics.length > 0 && (
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
                      </div>
                    )}
                  </div>
                )}

                <ClosedPositions
                  positions={state.closed}
                  priceData={state.priceData}
                />
              </>
            )}
          </>
        )}

        <footer className="app-footer">
          <p>{t.footer}</p>
        </footer>
      </div>
    </ThemeContext.Provider>
    </LanguageContext.Provider>
  );
}

export default App;
