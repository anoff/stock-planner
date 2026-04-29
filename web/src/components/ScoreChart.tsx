import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Legend,
} from 'recharts';
import type { ResearchResult } from '../utils/research';
import { SIGNAL_COLOR } from '../utils/scoring';

interface Props {
  results: ResearchResult[];
}

// Category color palette
const CAT_COLORS: Record<string, string> = {
  Valuation: '#6366f1',
  Quality:   '#22c55e',
  Health:    '#3b82f6',
  Growth:    '#f59e0b',
  Momentum:  '#ef4444',
};

type ChartEntry = {
  ticker: string;
  name: string;
  Valuation: number;
  Quality: number;
  Health: number;
  Growth: number;
  Momentum: number;
  finalScore: number;
  finalSignal: string;
};

/** Custom Y-axis tick that renders ticker on line 1 and name on line 2. */
function TickerTick(props: {
  x?: number; y?: number; payload?: { value: string };
  nameMap: Record<string, string>;
}) {
  const { x = 0, y = 0, payload, nameMap } = props;
  const ticker = payload?.value ?? '';
  const name = nameMap[ticker] ?? '';
  // Truncate name to keep label readable
  const shortName = name.length > 18 ? name.slice(0, 17) + '…' : name;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-4} y={-5} textAnchor="end" fill="#111827" fontSize={12} fontWeight={600}>
        {ticker}
      </text>
      <text x={-4} y={9} textAnchor="end" fill="#6b7280" fontSize={10}>
        {shortName}
      </text>
    </g>
  );
}

export default function ScoreChart({ results }: Props) {
  if (results.length === 0) return null;

  // Build ticker → name lookup used by both custom ticks
  const nameMap: Record<string, string> = {};
  results.forEach((r) => { nameMap[r.ticker] = r.name; });

  const data: ChartEntry[] = results.map((r) => ({
    ticker: r.ticker,
    name: r.name,
    Valuation: r.evaluation.categories['Valuation']?.score ?? 0,
    Quality:   r.evaluation.categories['Quality']?.score   ?? 0,
    Health:    r.evaluation.categories['Health']?.score    ?? 0,
    Growth:    r.evaluation.categories['Growth']?.score    ?? 0,
    Momentum:  r.evaluation.categories['Momentum']?.score  ?? 0,
    finalScore: r.evaluation.finalScore,
    finalSignal: r.evaluation.finalSignal,
  }));

  // Final score bar chart (simple, sorted by score)
  const scoreData = [...results]
    .sort((a, b) => b.evaluation.finalScore - a.evaluation.finalScore)
    .map((r) => ({
      ticker: r.ticker,
      name: r.name,
      score: r.evaluation.finalScore,
      signal: r.evaluation.finalSignal,
    }));

  const yAxisWidth = 160;

  return (
    <div className="score-chart-section">
      <h2 className="research-section-title">Scores</h2>

      {/* Category breakdown grouped bar chart */}
      <h3 className="chart-subtitle">Category Breakdown</h3>
      <ResponsiveContainer width="100%" height={Math.max(220, results.length * 60 + 60)}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
          barCategoryGap="25%"
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="ticker"
            width={yAxisWidth}
            tick={(props) => {
            const { x, y, payload } = props as { x?: number; y?: number; payload?: { value: string } };
            return <TickerTick x={x} y={y} payload={payload} nameMap={nameMap} />;
          }}
          />
          <Tooltip
            formatter={(value) => [`${(value as number).toFixed(1)}`]}
            labelFormatter={(label) => `${label} — ${nameMap[label] ?? ''}`}
          />
          <Legend />
          <ReferenceLine x={50} stroke="#9ca3af" strokeDasharray="4 2" />
          {Object.keys(CAT_COLORS).map((cat) => (
            <Bar key={cat} dataKey={cat} fill={CAT_COLORS[cat]} radius={[0, 3, 3, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Final score bar chart */}
      <h3 className="chart-subtitle" style={{ marginTop: 24 }}>Final Score</h3>
      <ResponsiveContainer width="100%" height={Math.max(160, scoreData.length * 48 + 60)}>
        <BarChart
          layout="vertical"
          data={scoreData}
          margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="ticker"
            width={yAxisWidth}
            tick={(props) => {
              const { x, y, payload } = props as { x?: number; y?: number; payload?: { value: string } };
              return <TickerTick x={x} y={y} payload={payload} nameMap={nameMap} />;
            }}
          />
          <Tooltip
            formatter={(v) => [`${(v as number).toFixed(1)}`, 'Score']}
            labelFormatter={(label) => `${label} — ${nameMap[label] ?? ''}`}
          />
          <ReferenceLine x={50} stroke="#9ca3af" strokeDasharray="4 2" label={{ value: '50', position: 'top', fontSize: 10 }} />
          <ReferenceLine x={70} stroke="#b59000" strokeDasharray="4 2" label={{ value: '70', position: 'top', fontSize: 10 }} />
          <ReferenceLine x={85} stroke="#22863a" strokeDasharray="4 2" label={{ value: '85', position: 'top', fontSize: 10 }} />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {scoreData.map((entry) => (
              <Cell
                key={entry.ticker}
                fill={SIGNAL_COLOR[entry.signal] ?? '#6b7280'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
