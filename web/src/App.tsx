import { useCallback, useEffect, useState } from "react";
import DropZone from "./components/DropZone";
import MetricsTable from "./components/MetricsTable";
import ScatterPlot from "./components/ScatterPlot";
import Summary from "./components/Summary";
import ResearchPage from "./components/ResearchPage";
import PositionChart from "./components/PositionChart";
import ClosedPositions from "./components/ClosedPositions";
import OutperformanceChart from "./components/OutperformanceChart";
import { decodeFile, parseTrades, parsePastedTrades } from "./utils/csv";
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
import "./App.css";

type Tab = "research" | "portfolio";

type AppState =
  | { stage: "idle" }
  | { stage: "parsing" }
  | { stage: "fetching"; progress: number; total: number }
  | {
      stage: "done";
      metrics: PositionMetrics[];
      closed: ClosedPosition[];
      priceData: PriceData;
      trades: Trade[];
      tradeCount: number;
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

  // ── Shared pipeline: positions → prices → metrics ────────────
  const processTrades = useCallback(
    async (allTrades: Trade[]) => {
      const buyTrades = allTrades.filter((t) => t.side === "buy");
      if (buyTrades.length === 0) {
        setState({ stage: "error", message: "No buy trades found." });
        return;
      }

      const tickers = [
        ...new Set(
          buyTrades.map((t) => t.yfTicker).filter((t) => t !== "")
        ),
        benchmarkTicker,
      ];

      setState({ stage: "fetching", progress: 0, total: tickers.length });

      const priceData = await fetchPriceData(tickers, (done, total) => {
        setState({ stage: "fetching", progress: done, total });
      });

      const positions = aggregatePositions(allTrades, priceData);
      const metrics = calculateMetrics(positions, priceData, benchmarkTicker);
      const closed = computeClosedPositions(allTrades);

      if (metrics.length === 0 && closed.length === 0) {
        setState({
          stage: "error",
          message:
            "Could not calculate metrics for any position. Price data may be unavailable.",
        });
        return;
      }

      setState({
        stage: "done",
        metrics,
        closed,
        priceData,
        trades: allTrades,
        tradeCount: buyTrades.length,
      });
    },
    [benchmarkTicker]
  );

  const handleFile = useCallback(
    async (buffer: ArrayBuffer, fileName: string) => {
      try {
        setState({ stage: "parsing" });
        const text = decodeFile(buffer);
        const allTrades: Trade[] = parseTrades(text);
        console.log(`Parsed ${fileName}: ${allTrades.length} trades`);
        await processTrades(allTrades);
      } catch (err) {
        setState({
          stage: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [processTrades]
  );

  const handlePaste = useCallback(
    async (pastedText: string) => {
      try {
        setState({ stage: "parsing" });
        const allTrades: Trade[] = parsePastedTrades(pastedText);
        console.log(`Parsed pasted text: ${allTrades.length} trades`);
        await processTrades(allTrades);
      } catch (err) {
        setState({
          stage: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [processTrades]
  );

  const benchmarkName =
    BENCHMARK_OPTIONS.find((b) => b.ticker === benchmarkTicker)?.name ??
    benchmarkTicker;

  return (
    <ThemeContext.Provider value={{ theme, chart: CHART_COLORS[theme], toggleTheme }}>
      <div className="app">
        <header className="app-header">
          <h1>Stock Planner</h1>
          <nav className="app-tabs">
            <button
              className={`app-tab${activeTab === "research" ? " app-tab--active" : ""}`}
              onClick={() => setActiveTab("research")}
            >
              Research
            </button>
            <button
              className={`app-tab${activeTab === "portfolio" ? " app-tab--active" : ""}`}
              onClick={() => setActiveTab("portfolio")}
            >
              Rakuten Analysis
            </button>
          </nav>
          {activeTab === "research" && (
            <p>Enter tickers to get a quantitative research report with scoring across Valuation, Quality, Health, Growth &amp; Momentum.</p>
          )}
          {activeTab === "portfolio" && (
            <p>
              Drop a Rakuten Securities CSV to analyze performance vs {benchmarkName}
            </p>
          )}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </header>

        {activeTab === "research" && <ResearchPage />}

        {activeTab === "portfolio" && (
          <>
            {state.stage === "idle" && (
              <>
                <div className="benchmark-row">
                  <label htmlFor="benchmark-select">Reference benchmark:</label>
                  <select
                    id="benchmark-select"
                    className="styled-select"
                    value={benchmarkTicker}
                    onChange={(e) => setBenchmarkTicker(e.target.value)}
                  >
                    {BENCHMARK_OPTIONS.map((b) => (
                      <option key={b.ticker} value={b.ticker}>
                        {b.name} ({b.ticker})
                      </option>
                    ))}
                  </select>
                </div>
                <DropZone onFileLoaded={handleFile} onPasteLoaded={handlePaste} />
              </>
            )}

            {state.stage === "parsing" && (
              <div className="status">Parsing CSV…</div>
            )}

            {state.stage === "fetching" && (
              <div className="status">
                <div>Fetching price data… {state.progress}/{state.total}</div>
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
                <button onClick={() => setState({ stage: "idle" })}>Try again</button>
              </div>
            )}

            {state.stage === "done" && (
              <>
                <div style={{ textAlign: "center", margin: "20px 0 4px" }}>
                  <button
                    className="btn"
                    onClick={() => setState({ stage: "idle" })}
                  >
                    ↩ Load another file
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
                      📉 Position History Charts
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "-8px 0 14px" }}>
                      Price timeseries with{" "}
                      <span style={{ color: "#22c55e", fontWeight: 600 }}>B</span> = buy,{" "}
                      <span style={{ color: "#f87171", fontWeight: 600 }}>S</span> = sell markers.
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                      <button
                        className={`btn${showDetailCharts ? " btn-active" : ""}`}
                        onClick={() => setShowDetailCharts((v) => !v)}
                      >
                        {showDetailCharts ? "Hide Charts" : "📈 Show Charts"}
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
          <p>Data sourced from Yahoo Finance. All calculations are performed in the browser.</p>
        </footer>
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
