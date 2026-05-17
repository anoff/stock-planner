import { useState, useCallback } from 'react';
import TickerInput from './TickerInput';
import ResearchOverview from './ResearchOverview';
import StockDetail from './StockDetail';
import ScoreChart from './ScoreChart';
import { fetchPriceData } from '../utils/prices';
import { computeResearchMetrics } from '../utils/research';
import type { ResearchResult, ResearchProgress } from '../utils/research';
import type { PriceData } from '../utils/types';
import { useLanguage } from '../i18n';

type PageState =
  | { stage: 'idle' }
  | { stage: 'fetching-prices'; progress: number; total: number }
  | { stage: 'fetching-info'; progress: number; total: number }
  | { stage: 'done'; results: ResearchResult[]; tickers: string[]; benchmark: string; priceData: PriceData; warnings: string[] }
  | { stage: 'error'; message: string };

export default function ResearchPage() {
  const [state, setState] = useState<PageState>({ stage: 'idle' });
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleSubmit = useCallback(async (tickers: string[], benchmark: string) => {
    setSelectedTicker(null);
    try {
      // Fetch price history for tickers + benchmark
      const allTickers = [...new Set([...tickers, benchmark])];
      setState({ stage: 'fetching-prices', progress: 0, total: allTickers.length });

      const { data: priceData, failed: failedPrices } = await fetchPriceData(allTickers, (done, total) => {
        setState({ stage: 'fetching-prices', progress: done, total });
      });

      if (Object.keys(priceData).length === 0) {
        setState({ stage: 'error', message: t.noPriceData });
        return;
      }

      // Fetch fundamentals + compute metrics
      setState({ stage: 'fetching-info', progress: 0, total: tickers.length });

      const { results, failedInfo } = await computeResearchMetrics(
        tickers,
        benchmark,
        priceData,
        (p: ResearchProgress) => {
          setState({ stage: 'fetching-info', progress: p.done, total: p.total });
        },
      );

      if (results.length === 0) {
        setState({ stage: 'error', message: t.noResults });
        return;
      }

      const warnings: string[] = [];
      // Exclude the benchmark from price failure warnings (it's not shown in results)
      const failedUserPrices = failedPrices.filter(tp => tickers.includes(tp));
      if (failedUserPrices.length > 0) {
        warnings.push(t.pricesUnavailableFor(failedUserPrices.join(', ')));
      }
      if (failedInfo.length > 0) {
        warnings.push(t.fundamentalsUnavailableFor(failedInfo.join(', ')));
      }

      setState({ stage: 'done', results, tickers, benchmark, priceData, warnings });
    } catch (err) {
      setState({
        stage: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [t]);

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
              ? t.fetchingPrices(state.progress, state.total)
              : t.fetchingFundamentals(state.progress, state.total)}
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
          <button onClick={() => setState({ stage: 'idle' })}>{t.tryAgain}</button>
        </div>
      )}

      {state.stage === 'done' && (
        <>
          {state.warnings.length > 0 && (
            <div className="warning">
              {state.warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          )}

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
            <h2 className="research-section-title">{t.signalLegend}</h2>
            <div className="research-legend-grid">
              <div>
                <h4 className="detail-section-title">{t.finalSignalLabel}</h4>
                <table className="detail-table">
                  <thead>
                    <tr><th>{t.signalCol}</th><th>{t.scoreCol}</th><th>{t.actionCol}</th></tr>
                  </thead>
                  <tbody>
                    {[
                      ['STRONG_BUY', '> 85',  t.strongBuyAction, '#22863a'],
                      ['BUY',        '70–85', t.buyAction,        '#3b82f6'],
                      ['HOLD',       '50–70', t.holdAction,       '#b59000'],
                      ['SELL',       '35–50', t.sellAction,       '#d97706'],
                      ['STRONG_SELL','< 35',  t.strongSellAction, '#cb2431'],
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
                <h4 className="detail-section-title">{t.categoryIconsLabel}</h4>
                <table className="detail-table">
                  <thead><tr><th>{t.iconCol}</th><th>{t.labelCol}</th><th>{t.scoreCol}</th></tr></thead>
                  <tbody>
                    {[
                      ['🔵', t.scoreStrong,  '> 80'],
                      ['🟢', t.scoreGood,    '60–80'],
                      ['🟡', t.scoreNeutral, '40–60'],
                      ['🟠', t.scoreWeak,    '20–40'],
                      ['🔴', t.scorePoor,    '< 20'],
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
              {t.disclaimer}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
