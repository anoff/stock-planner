import type { ResearchResult } from '../utils/research';
import { fmtPrice } from '../utils/research';
import {
  fmtPct, fmtRawMetric, CATEGORIES,
  SIGNAL_COLOR,
} from '../utils/scoring';
import type { PriceHistory } from '../utils/types';
import PositionChart from './PositionChart';
import { useLanguage } from '../i18n';

interface Props {
  result: ResearchResult;
  priceHistory?: PriceHistory;
  buyDates?: Date[];
  sellDates?: Date[];
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
  description,
}: {
  score: number;
  label: string;
  icon: string;
  description?: string;
}) {
  const { t } = useLanguage();
  const color = score > 70 ? '#22863a' : score > 50 ? '#b59000' : '#cb2431';
  return (
    <tr>
      <td>
        <span className="metric-label-with-desc">
          {icon} {label}
          {description && (
            <span
              className="metric-desc-icon"
              data-tooltip={description}
              aria-label={description}
              tabIndex={0}
              role="tooltip"
            >ⓘ</span>
          )}
        </span>
      </td>
      <td style={{ textAlign: 'right', color, fontWeight: 600 }}>{score.toFixed(1)}</td>
      <td style={{ color: '#6b7280' }}>{
        score > 80 ? t.scoreStrong : score > 60 ? t.scoreGood : score > 40 ? t.scoreNeutral : score > 20 ? t.scoreWeak : t.scorePoor
      }</td>
    </tr>
  );
}

export default function StockDetail({ result, priceHistory, buyDates = [], sellDates = [], onClose }: Props) {
  const { evaluation, ticker, name, currency } = result;
  const { finalSignal, finalScore, vetoed, vetoReasons, categories } = evaluation;
  const signalColor = SIGNAL_COLOR[finalSignal] ?? '#333';
  const { t } = useLanguage();

  const signalActionMap: Record<string, string> = {
    STRONG_BUY:  t.strongBuyAction,
    BUY:         t.buyAction,
    HOLD:        t.holdAction,
    SELL:        t.sellAction,
    STRONG_SELL: t.strongSellAction,
  };
  const signalAction = signalActionMap[finalSignal] ?? '';

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
              ? `${fmtPrice(result.currentPrice, currency)} — ${t.closeOf(result.priceDate ?? '—')}`
              : t.priceUnavailable}
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
            buyDates={buyDates}
            sellDates={sellDates}
          />
        </div>
      )}

      {vetoed && vetoReasons.length > 0 && (
        <div className="stock-detail-veto">
          <strong>{t.vetoOverride}</strong>{' '}
          {vetoReasons.join('; ')}
        </div>
      )}

      <div className="stock-detail-grid">
        {/* Scoring breakdown */}
        <div>
          <h4 className="detail-section-title">{t.scoringBreakdown}</h4>
          <table className="detail-table">
            <thead>
              <tr>
                <th>{t.colCategory}</th>
                <th style={{ textAlign: 'right' }}>{t.colScore}</th>
                <th>{t.colLabel}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categories).map(([catName, cat]) => (
                <ScoreRow
                  key={catName}
                  score={cat.score}
                  label={t.categoryNames[catName] ?? catName}
                  icon={cat.icon}
                  description={t.categoryDescriptions[catName]}
                />
              ))}
              <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                <td style={{ fontWeight: 700 }}>{t.finalLabel}</td>
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
          <h4 className="detail-section-title">{t.pricePerformance}</h4>
          <table className="detail-table">
            <tbody>
              <PctRow label={t.colCagr5y} value={result.cagr5y} />
              <PctRow label={t.colCagr3y} value={result.cagr3y} />
              <PctRow label={t.colCagr1y} value={result.cagr1y} />
              <PctRow label={t.labelAlphaVs('5Y', result.benchmark)} value={result.alpha5y} />
              <PctRow label={t.labelAlphaVs('3Y', result.benchmark)} value={result.alpha3y} />
              <PctRow label={t.labelAlphaVs('1Y', result.benchmark)} value={result.alpha1y} />
              <PctRow label={t.labelAlphaVs('6M', result.benchmark)} value={result.alpha6m} />
              <PctRow label={t.labelAlphaVs('1M', result.benchmark)} value={result.alpha1m} />
              <PctRow label={t.labelReturn6m} value={result.ret6m} />
              <PctRow label={t.labelReturn1m} value={result.ret1m} />
              <tr>
                <td className="detail-label">{t.dataAvailable}</td>
                <td style={{ textAlign: 'right' }}>{result.dataMonths.toFixed(0)} {t.months}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Metric details per category */}
      <h4 className="detail-section-title" style={{ marginTop: 16 }}>{t.metricDetails}</h4>
      <div className="table-scroll">
        <table className="detail-table detail-table--metrics">
          <thead>
            <tr>
              <th>{t.colCategory}</th>
              <th>{t.colMetric}</th>
              <th style={{ textAlign: 'right' }}>{t.colRaw}</th>
              <th style={{ textAlign: 'right' }}>{t.colNormalized}</th>
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
                      <td style={{ color: '#6b7280' }}>{t.categoryNames[catName] ?? catName}</td>
                      <td>
                        <span className="metric-label-with-desc">
                          {t.metricLabels[m] ?? m}
                          {t.metricDescriptions[m] && (
                            <span
                              className="metric-desc-icon"
                              data-tooltip={t.metricDescriptions[m]}
                              aria-label={t.metricDescriptions[m]}
                              tabIndex={0}
                              role="tooltip"
                            >ⓘ</span>
                          )}
                        </span>
                      </td>
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
