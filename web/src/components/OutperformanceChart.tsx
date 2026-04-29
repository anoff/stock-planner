import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { PositionMetrics } from "../utils/types";
import { useTheme } from "../theme";

interface Props {
  metrics: PositionMetrics[];
  benchmark: string;
}

// Colours (not relying on CSS vars since recharts SVG can't read them)
const COLOR_OUT_LIGHT = "#7c3aed";  // outperforming — purple
const COLOR_OUT_DARK = "#a78bfa";
const COLOR_UNDER_LIGHT = "#e9d5ff"; // underperforming — muted purple
const COLOR_UNDER_DARK = "#4c4577";

interface BarDatum {
  name: string;
  out: number;   // 0-100
  under: number; // 0-100
  outCount: number;
  totalCount: number;
}

function buildData(metrics: PositionMetrics[]): BarDatum[] {
  const eligible = metrics.filter((m) => m.signal !== "⏳ Too Early");

  // Alpha CAGR by count
  const acOut = eligible.filter((m) => m.alphaCagr != null && m.alphaCagr > 0).length;
  const acTotal = eligible.filter((m) => m.alphaCagr != null).length;

  // Alpha CAGR by volume (totalCost-weighted)
  let avOut = 0, avTotal = 0;
  for (const m of eligible) {
    if (m.alphaCagr == null) continue;
    avTotal += m.totalCost;
    if (m.alphaCagr > 0) avOut += m.totalCost;
  }

  // CAGR by count
  const ccOut = eligible.filter((m) => m.cagr > 0).length;
  const ccTotal = eligible.length;

  // CAGR by volume (totalCost-weighted)
  let cvOut = 0, cvTotal = 0;
  for (const m of eligible) {
    cvTotal += m.totalCost;
    if (m.cagr > 0) cvOut += m.totalCost;
  }

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

  return [
    {
      name: "α CAGR\n(count)",
      out: pct(acOut, acTotal),
      under: pct(acTotal - acOut, acTotal),
      outCount: acOut,
      totalCount: acTotal,
    },
    {
      name: "α CAGR\n(volume)",
      out: pct(avOut, avTotal),
      under: pct(avTotal - avOut, avTotal),
      outCount: Math.round((avOut / (avTotal || 1)) * 100),
      totalCount: 100,
    },
    {
      name: "CAGR\n(count)",
      out: pct(ccOut, ccTotal),
      under: pct(ccTotal - ccOut, ccTotal),
      outCount: ccOut,
      totalCount: ccTotal,
    },
    {
      name: "CAGR\n(volume)",
      out: pct(cvOut, cvTotal),
      under: pct(cvTotal - cvOut, cvTotal),
      outCount: Math.round((cvOut / (cvTotal || 1)) * 100),
      totalCount: 100,
    },
  ];
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: BarDatum;
}

function CustomTooltip({
  active,
  payload,
  label,
  isVolume,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  isVolume?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isVol = isVolume ?? (label?.includes("volume") ?? false);
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
        color: "var(--text-primary)",
        minWidth: 160,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--accent)" }}>
        {label?.replace("\\n", " ")}
      </div>
      <div style={{ color: "var(--positive)" }}>
        Outperforming: {d.out}%{!isVol ? ` (${d.outCount}/${d.totalCount})` : ""}
      </div>
      <div style={{ color: "var(--text-muted)" }}>
        Underperforming: {d.under}%
      </div>
    </div>
  );
}

export default function OutperformanceChart({ metrics, benchmark }: Props) {
  const { theme, chart } = useTheme();

  const colorOut = theme === "dark" ? COLOR_OUT_DARK : COLOR_OUT_LIGHT;
  const colorUnder = theme === "dark" ? COLOR_UNDER_DARK : COLOR_UNDER_LIGHT;

  const eligible = metrics.filter((m) => m.signal !== "⏳ Too Early");
  if (eligible.length === 0) return null;

  const data = buildData(metrics);

  return (
    <div style={{ margin: "28px 0" }}>
      <div className="section-title">📊 Outperformance Breakdown</div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "-8px 0 14px" }}>
        Share of positions (or portfolio volume) beating the benchmark / being profitable.
        Excludes ⏳ Too Early positions. Benchmark: {benchmark}.
      </p>
      <div
        className="chart-card"
        style={{ padding: "20px 8px 8px" }}
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 8 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: chart.axisText, fontSize: 11 }}
              tickFormatter={(v: string) => v.replace("\\n", " ")}
              interval={0}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: chart.axisText, fontSize: 11 }}
              width={36}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: theme === "dark" ? "rgba(167,139,250,0.07)" : "rgba(124,58,237,0.05)" }}
            />
            <Bar dataKey="out" stackId="a" name="Outperforming" fill={colorOut} radius={[0, 0, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={colorOut} />
              ))}
            </Bar>
            <Bar dataKey="under" stackId="a" name="Underperforming" fill={colorUnder} radius={[4, 4, 0, 0]}>
              {data.map((_entry, i) => (
                <Cell
                  key={i}
                  fill={colorUnder}
                // label inside bar showing the "out" pct
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          <span>
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: colorOut, marginRight: 5, verticalAlign: "middle" }} />
            Outperforming
          </span>
          <span>
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: colorUnder, marginRight: 5, verticalAlign: "middle" }} />
            Underperforming
          </span>
        </div>
      </div>
    </div>
  );
}
