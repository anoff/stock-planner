import { useState, useCallback } from 'react';
import TickerInput from './TickerInput';
import ResearchOverview from './ResearchOverview';
import StockDetail from './StockDetail';
import ScoreChart from './ScoreChart';
import { fetchPriceData } from '../utils/prices';
import { computeResearchMetrics } from '../utils/research';
import type { ResearchResult, ResearchProgress } from '../utils/research';
import type { PriceData } from '../utils/types';

type PageState =
  | { stage: 'idle' }
  | { stage: 'fetching-prices'; progress: number; total: number }
  | { stage: 'fetching-info'; progress: number; total: number }
  | { stage: 'done'; results: ResearchResult[]; tickers: string[]; benchmark: string; priceData: PriceData }
  | { stage: 'error'; message: string };

export default function ResearchPage() {
  const [state, setState] = useState<PageState>({ stage: 'idle' });
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const handleSubmit = useCallback(async (tickers: string[], benchmark: string) => {
    setSelectedTicker(null);
    try {
      // Fetch price history for tickers + benchmark
      const allTickers = [...new Set([...tickers, benchmark])];
      setState({ stage: 'fetching-prices', progress: 0, total: allTickers.length });

      const priceData = await fetchPriceData(allTickers, (done, total) => {
        setState({ stage: 'fetching-prices', progress: done, total });
      });

      if (Object.keys(priceData).length === 0) {
        setState({ stage: 'error', message: 'Could not fetch any price data. Check ticker symbols and network.' });
        return;
      }

      // Fetch fundamentals + compute metrics
      setState({ stage: 'fetching-info', progress: 0, total: tickers.length });

      const results = await computeResearchMetrics(
        tickers,
        benchmark,
        priceData,
        (p: ResearchProgress) => {
          setState({ stage: 'fetching-info', progress: p.done, total: p.total });
        },
      );

      if (results.length === 0) {
        setState({ stage: 'error', message: 'No results — price data may be unavailable for the given tickers.' });
        return;
      }

      setState({ stage: 'done', results, tickers, benchmark, priceData });
    } catch (err) {
      setState({
        stage: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const handleSelectTicker = useCallback((ticker: string | null) => {
    setSelectedTicker((prev) => (prev === ticker ? null : ticker));
  }, []);

  const selectedResult =
    state.stage === 'done'
      ? state.results.find((r) => r.ticker === selectedTicker) ?? null
      : null;

  return (
    <div className="research-page">
      <TickerInput
        onSubmit={handleSubmit}
        loading={state.stage === 'fetching-prices' || state.stage === 'fetching-info'}
      />

      {(state.stage === 'fetching-prices' || state.stage === 'fetching-info') && (
        <div className="status">
          <div>
            {state.stage === 'fetching-prices'
              ? `Fetching price history… ${state.progress}/${state.total}`
              : `Fetching fundamentals… ${state.progress}/${state.total}`}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(state.progress / state.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {state.stage === 'error' && (
        <div className="error">
          <p>{state.message}</p>
          <button onClick={() => setState({ stage: 'idle' })}>Try again</button>
        </div>
      )}

      {state.stage === 'done' && (
        <>
          <ResearchOverview
            results={state.results}
            onSelectTicker={handleSelectTicker}
            selectedTicker={selectedTicker}
          />

          {selectedResult && (
            <StockDetail
              result={selectedResult}
              priceHistory={state.priceData[selectedResult.ticker]}
              onClose={() => setSelectedTicker(null)}
            />
          )}

          <ScoreChart results={state.results} />

          <div className="research-legend">
            <h2 className="research-section-title">Signal Legend</h2>
            <div className="research-legend-grid">
              <div>
                <h4 className="detail-section-title">Final Signal</h4>
                <table className="detail-table">
                  <thead>
                    <tr><th>Signal</th><th>Score</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {[
                      ['STRONG_BUY', '> 85', 'High conviction buy', '#22863a'],
                      ['BUY',        '70–85', 'Consider buying',     '#3b82f6'],
                      ['HOLD',       '50–70', 'Monitor, no action',  '#b59000'],
                      ['SELL',       '35–50', 'Consider avoiding',   '#d97706'],
                      ['STRONG_SELL','< 35',  'Avoid',               '#cb2431'],
                    ].map(([sig, range, action, color]) => (
                      <tr key={sig as string}>
                        <td style={{ fontWeight: 600, color: color as string }}>{sig as string}</td>
                        <td>{range as string}</td>
                        <td>{action as string}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="detail-section-title">Category Icons</h4>
                <table className="detail-table">
                  <thead><tr><th>Icon</th><th>Label</th><th>Score</th></tr></thead>
                  <tbody>
                    {[
                      ['🔵', 'STRONG',  '> 80'],
                      ['🟢', 'GOOD',    '60–80'],
                      ['🟡', 'NEUTRAL', '40–60'],
                      ['🟠', 'WEAK',    '20–40'],
                      ['🔴', 'POOR',    '< 20'],
                    ].map(([icon, label, range]) => (
                      <tr key={label as string}>
                        <td>{icon as string}</td>
                        <td>{label as string}</td>
                        <td>{range as string}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="research-disclaimer">
              Data sourced from Yahoo Finance via yahoo-finance2. Prices are split- and
              dividend-adjusted closing prices. 6M/1M windows = 180/30 calendar days;
              nearest prior trading-day close is used at both ends. Fundamental data is
              best-effort and may be unavailable for some tickers.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
