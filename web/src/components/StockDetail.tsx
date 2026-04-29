import type { ResearchResult } from '../utils/research';
import { fmtPrice } from '../utils/research';
import {
  fmtPct, fmtRawMetric, CATEGORIES, METRIC_LABELS,
  SIGNAL_COLOR, SIGNAL_ACTIONS,
} from '../utils/scoring';
import type { PriceHistory } from '../utils/types';
import PositionChart from './PositionChart';

interface Props {
  result: ResearchResult;
  priceHistory?: PriceHistory;
  onClose?: () => void;
}

function PctRow({ label, value }: { label: string; value: number | null }) {
  const text = fmtPct(value);
  const color = value === null ? '#6b7280' : value >= 0 ? '#22863a' : '#cb2431';
  return (
    <tr>
      <td className="detail-label">{label}</td>
      <td style={{ textAlign: 'right', color, fontWeight: 500 }}>{text}</td>
    </tr>
  );
}

function ScoreRow({
  score,
  label,
  icon,
}: {
  score: number;
  label: string;
  icon: string;
}) {
  const color = score > 70 ? '#22863a' : score > 50 ? '#b59000' : '#cb2431';
  return (
    <tr>
      <td>{icon} {label}</td>
      <td style={{ textAlign: 'right', color, fontWeight: 600 }}>{score.toFixed(1)}</td>
      <td style={{ color: '#6b7280' }}>{
        // small fuzzy text
        score > 80 ? 'Strong' : score > 60 ? 'Good' : score > 40 ? 'Neutral' : score > 20 ? 'Weak' : 'Poor'
      }</td>
    </tr>
  );
}

export default function StockDetail({ result, priceHistory, onClose }: Props) {
  const { evaluation, ticker, name, currency } = result;
  const { finalSignal, finalScore, vetoed, vetoReasons, categories } = evaluation;
  const signalColor = SIGNAL_COLOR[finalSignal] ?? '#333';
  const signalAction = SIGNAL_ACTIONS[finalSignal] ?? '';

  return (
    <div className="stock-detail">
      <div className="stock-detail-header">
        <div>
          <h3 className="stock-detail-title">
            {ticker}
            {name !== ticker && (
              <span className="stock-detail-subtitle"> — {name}</span>
            )}
            {currency && <span className="stock-detail-currency"> ({currency})</span>}
          </h3>
          <div className="stock-detail-price">
            {result.currentPrice !== null
              ? `${fmtPrice(result.currentPrice, currency)} — close of ${result.priceDate ?? '—'}`
              : 'Price unavailable'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div className="stock-detail-signal" style={{ color: signalColor }}>
            <div className="stock-detail-signal-text">{finalSignal}</div>
            <div className="stock-detail-signal-score">{finalScore.toFixed(1)} / 100</div>
            <div className="stock-detail-signal-action">{signalAction}</div>
          </div>
          {onClose && (
            <button className="stock-detail-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>
      </div>

      {priceHistory && priceHistory.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <PositionChart
            name={name}
            ticker={ticker}
            priceHistory={priceHistory}
            buyDates={[]}
          />
        </div>
      )}

      {vetoed && vetoReasons.length > 0 && (
        <div className="stock-detail-veto">
          <strong>Veto override:</strong>{' '}
          {vetoReasons.join('; ')}
        </div>
      )}

      <div className="stock-detail-grid">
        {/* Scoring breakdown */}
        <div>
          <h4 className="detail-section-title">Scoring Breakdown</h4>
          <table className="detail-table">
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Score</th>
                <th>Label</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categories).map(([catName, cat]) => (
                <ScoreRow
                  key={catName}
                  score={cat.score}
                  label={catName}
                  icon={cat.icon}
                />
              ))}
              <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                <td style={{ fontWeight: 700 }}>Final</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: signalColor }}>
                  {finalScore.toFixed(1)}
                </td>
                <td style={{ fontWeight: 700, color: signalColor }}>{finalSignal}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Price & performance */}
        <div>
          <h4 className="detail-section-title">Price &amp; Performance</h4>
          <table className="detail-table">
            <tbody>
              <PctRow label="5Y CAGR" value={result.cagr5y} />
              <PctRow label="3Y CAGR" value={result.cagr3y} />
              <PctRow label="1Y CAGR" value={result.cagr1y} />
              <PctRow label={`α 5Y vs ${result.benchmark}`} value={result.alpha5y} />
              <PctRow label={`α 3Y vs ${result.benchmark}`} value={result.alpha3y} />
              <PctRow label={`α 1Y vs ${result.benchmark}`} value={result.alpha1y} />
              <PctRow label={`α 6M vs ${result.benchmark}`} value={result.alpha6m} />
              <PctRow label={`α 1M vs ${result.benchmark}`} value={result.alpha1m} />
              <PctRow label="Return 6M" value={result.ret6m} />
              <PctRow label="Return 1M" value={result.ret1m} />
              <tr>
                <td className="detail-label">Data available</td>
                <td style={{ textAlign: 'right' }}>{result.dataMonths.toFixed(0)} months</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Metric details per category */}
      <h4 className="detail-section-title" style={{ marginTop: 16 }}>Metric Details</h4>
      <div className="table-scroll">
        <table className="detail-table detail-table--metrics">
          <thead>
            <tr>
              <th>Category</th>
              <th>Metric</th>
              <th style={{ textAlign: 'right' }}>Raw</th>
              <th style={{ textAlign: 'right' }}>Normalized</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(CATEGORIES).map(([catName, metricNames]) =>
              metricNames
                .filter((m) => m !== 'freeCashflow') // internal-only veto metric
                .map((m) => {
                  const raw = evaluation.rawMetrics[m] ?? null;
                  const ns = categories[catName]?.subScores[m] ?? null;
                  const nsColor = ns === null ? '#6b7280' : ns > 65 ? '#22863a' : ns < 35 ? '#cb2431' : '#b59000';
                  return (
                    <tr key={`${catName}-${m}`}>
                      <td style={{ color: '#6b7280' }}>{catName}</td>
                      <td>{METRIC_LABELS[m] ?? m}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {fmtRawMetric(m, raw)}
                      </td>
                      <td style={{ textAlign: 'right', color: nsColor, fontWeight: 500 }}>
                        {ns !== null ? ns.toFixed(0) : '—'}
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
