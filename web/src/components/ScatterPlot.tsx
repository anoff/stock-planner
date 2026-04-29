import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { PositionMetrics } from "../utils/types";
import { useTheme } from "../theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTooltipProps = Partial<TooltipContentProps<any, any>>;

interface Props {
  metrics: PositionMetrics[];
}

function signalColor(signal: string): string {
  const map: Record<string, string> = {
    "🟢 Hold":        "#22c55e",
    "🟣 Take Profit": "#a78bfa",
    "🔵 Buy More":    "#60a5fa",
    "🟡 Watch":       "#fbbf24",
    "🔴 Sell":        "#f87171",
    "⏳ Too Early":   "#9ca3af",
  };
  return map[signal] ?? "#9ca3af";
}

type ScatterPoint = {
  name: string;
  ticker: string;
  alpha: number;
  momentum: number;
  signal: string;
};

function makeCustomTooltip(chart: ReturnType<typeof useTheme>["chart"]) {
  return function CustomTooltip({ active, payload }: AnyTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0].payload as ScatterPoint;
    return (
      <div
        style={{
          backgroundColor: chart.tooltipBg,
          border: `1px solid ${chart.tooltipBorder}`,
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          minWidth: 160,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 2, color: signalColor(p.signal), fontSize: 13 }}>
          {p.name}
        </div>
        <div style={{ color: chart.tooltipMuted, marginBottom: 8, fontSize: 11 }}>
          {p.ticker}
        </div>
        <div style={{ color: chart.tooltipText, marginBottom: 3 }}>
          Alpha CAGR: <strong>{p.alpha > 0 ? "+" : ""}{p.alpha}%</strong>
        </div>
        <div style={{ color: chart.tooltipText, marginBottom: 6 }}>
          6M Return: <strong>{p.momentum > 0 ? "+" : ""}{p.momentum}%</strong>
        </div>
        <div style={{ fontSize: 11, color: signalColor(p.signal), fontWeight: 600 }}>
          {p.signal}
        </div>
      </div>
    );
  };
}

export default function ScatterPlot({ metrics }: Props) {
  const { chart } = useTheme();

  const data: ScatterPoint[] = metrics
    .filter((m) => m.alphaCagr != null && m.ret6m != null)
    .map((m) => ({
      name:     m.name,
      ticker:   m.yfTicker,
      alpha:    +((m.alphaCagr ?? 0) * 100).toFixed(1),
      momentum: +((m.ret6m ?? 0) * 100).toFixed(1),
      signal:   m.signal,
    }));

  const CustomTooltip = makeCustomTooltip(chart);

  return (
    <div style={{ margin: "8px 0 32px" }}>
      <div className="section-title">🎯 Alpha vs 6M Momentum</div>

      <div className="card" style={{ padding: "16px 8px 8px" }}>
        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ top: 16, right: 32, bottom: 16, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis
              type="number"
              dataKey="alpha"
              name="Alpha CAGR %"
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: chart.axisText, fontSize: 11 }}
              axisLine={{ stroke: chart.grid }}
              tickLine={{ stroke: chart.grid }}
            />
            <YAxis
              type="number"
              dataKey="momentum"
              name="6M Return %"
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: chart.axisText, fontSize: 11 }}
              axisLine={{ stroke: chart.grid }}
              tickLine={{ stroke: chart.grid }}
            />
            <Tooltip content={(props) => <CustomTooltip {...(props as AnyTooltipProps)} />} />
            <ReferenceLine x={0} stroke={chart.refLine} strokeDasharray="4 4" strokeWidth={1.5} />
            <ReferenceLine y={0} stroke={chart.refLine} strokeDasharray="4 4" strokeWidth={1.5} />
            <Scatter data={data} name="Positions">
              {data.map((entry, i) => (
                <Cell key={i} fill={signalColor(entry.signal)} r={9} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            flexWrap: "wrap",
            fontSize: 12,
            padding: "8px 16px 12px",
            color: chart.axisText,
          }}
        >
          {["🟢 Hold", "🟣 Take Profit", "🔵 Buy More", "🟡 Watch", "🔴 Sell", "⏳ Too Early"].map(
            (s) => (
              <span key={s} style={{ color: signalColor(s), fontWeight: 500 }}>
                ● {s}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
