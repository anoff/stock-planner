import type { ResearchResult } from '../utils/research';
import { fmtPct, SIGNAL_COLOR, CATEGORY_ABBREVS, categoryIcons } from '../utils/scoring';
import { useLanguage } from '../i18n';

interface Props {
  results: ResearchResult[];
  onSelectTicker: (ticker: string | null) => void;
  selectedTicker: string | null;
}

function PctCell({ value }: { value: number | null }) {
  const text = fmtPct(value);
  const color = value === null ? '#6b7280' : value >= 0 ? '#22863a' : '#cb2431';
  return <td style={{ color, textAlign: 'right', whiteSpace: 'nowrap' }}>{text}</td>;
}

function ScoreCell({ score }: { score: number }) {
  const color = score > 70 ? '#22863a' : score > 50 ? '#b59000' : '#cb2431';
  return (
    <td style={{ color, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {score.toFixed(1)}
    </td>
  );
}

function SignalCell({ result }: { result: ResearchResult }) {
  const { finalSignal } = result.evaluation;
  const color = SIGNAL_COLOR[finalSignal] ?? '#333';
  const icons = categoryIcons(result.evaluation);
  return (
    <td style={{ color, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {finalSignal} <span style={{ fontWeight: 400, opacity: 0.85 }}>({icons})</span>
    </td>
  );
}

export default function ResearchOverview({ results, onSelectTicker, selectedTicker }: Props) {
  const abbrevs = CATEGORY_ABBREVS.join(', ');
  const { t } = useLanguage();

  return (
    <div className="research-overview">
      <h2 className="research-section-title">{t.overview}</h2>
      <div className="table-scroll">
        <table className="research-table">
          <thead>
            <tr>
              <th>{t.colName}</th>
              <th>{t.colTicker}</th>
              <th>{t.colCcy}</th>
              <th style={{ textAlign: 'right' }}>{t.colCagr5y}</th>
              <th style={{ textAlign: 'right' }}>{t.colCagr3y}</th>
              <th style={{ textAlign: 'right' }}>{t.colCagr1y}</th>
              <th style={{ textAlign: 'right' }}>{t.colAlpha1y}</th>
              <th style={{ textAlign: 'right' }}>{t.col6mShort}</th>
              <th style={{ textAlign: 'right' }}>{t.col1mShort}</th>
              <th style={{ textAlign: 'right' }}>{t.colScore}</th>
              <th>{t.signalWithAbbrevs(abbrevs)}</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const isSelected = r.ticker === selectedTicker;
              return (
                <tr
                  key={r.ticker}
                  className={`research-table-row${isSelected ? ' research-table-row--selected' : ''}`}
                  onClick={() => onSelectTicker(isSelected ? null : r.ticker)}
                  title={t.clickToExpand}
                >
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.name}
                  </td>
                  <td style={{ color: '#0969da', fontWeight: 500 }}>{r.ticker}</td>
                  <td style={{ color: '#6b7280' }}>{r.currency || '—'}</td>
                  <PctCell value={r.cagr5y} />
                  <PctCell value={r.cagr3y} />
                  <PctCell value={r.cagr1y} />
                  <PctCell value={r.alpha1y} />
                  <PctCell value={r.ret6m} />
                  <PctCell value={r.ret1m} />
                  <ScoreCell score={r.evaluation.finalScore} />
                  <SignalCell result={r} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
