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
import { useLanguage } from "../i18n";

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
  type: 'alpha' | 'cagr';
  out: number;   // 0-100
  under: number; // 0-100
  outCount: number;
  totalCount: number;
}

function buildData(metrics: PositionMetrics[], names: [string, string, string, string]): BarDatum[] {
  const eligible = metrics.filter((m) => m.signal !== "⏳ Too Early" && m.signal !== "⬛ Closed");

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
      name: names[0],
      type: 'alpha' as const,
      out: pct(acOut, acTotal),
      under: pct(acTotal - acOut, acTotal),
      outCount: acOut,
      totalCount: acTotal,
    },
    {
      name: names[1],
      type: 'alpha' as const,
      out: pct(avOut, avTotal),
      under: pct(avTotal - avOut, avTotal),
      outCount: Math.round((avOut / (avTotal || 1)) * 100),
      totalCount: 100,
    },
    {
      name: names[2],
      type: 'cagr' as const,
      out: pct(ccOut, ccTotal),
      under: pct(ccTotal - ccOut, ccTotal),
      outCount: ccOut,
      totalCount: ccTotal,
    },
    {
      name: names[3],
      type: 'cagr' as const,
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
  labelOut,
  labelUnder,
  labelProfitable,
  labelUnprofitable,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  isVolume?: boolean;
  labelOut?: string;
  labelUnder?: string;
  labelProfitable?: string;
  labelUnprofitable?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isVol = isVolume ?? (label?.includes("volume") ?? false);
  const isAlpha = d.type === 'alpha';
  const posLabel = isAlpha ? (labelOut ?? 'Outperforming') : (labelProfitable ?? 'Profitable');
  const negLabel = isAlpha ? (labelUnder ?? 'Underperforming') : (labelUnprofitable ?? 'Unprofitable');
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
        {posLabel}: {d.out}%{!isVol ? ` (${d.outCount}/${d.totalCount})` : ""}
      </div>
      <div style={{ color: "var(--text-muted)" }}>
        {negLabel}: {d.under}%
      </div>
    </div>
  );
}

export default function OutperformanceChart({ metrics, benchmark }: Props) {
  const { theme, chart } = useTheme();
  const { t } = useLanguage();

  const colorOut = theme === "dark" ? COLOR_OUT_DARK : COLOR_OUT_LIGHT;
  const colorUnder = theme === "dark" ? COLOR_UNDER_DARK : COLOR_UNDER_LIGHT;

  const eligible = metrics.filter((m) => m.signal !== "⏳ Too Early" && m.signal !== "⬛ Closed");
  if (eligible.length === 0) return null;

  const barNames: [string, string, string, string] = [
    t.barAlphaCagrCount,
    t.barAlphaCagrVolume,
    t.barCagrCount,
    t.barCagrVolume,
  ];
  const data = buildData(metrics, barNames);

  return (
    <div style={{ margin: "28px 0" }}>
      <div className="section-title">{t.outperformanceBreakdown}</div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "-8px 0 14px" }}>
        {t.outperformanceDesc(benchmark)}
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
              content={<CustomTooltip
                labelOut={t.tooltipOutperforming}
                labelUnder={t.tooltipUnderperforming}
                labelProfitable={t.tooltipProfitable}
                labelUnprofitable={t.tooltipUnprofitable}
              />}
              cursor={{ fill: theme === "dark" ? "rgba(167,139,250,0.07)" : "rgba(124,58,237,0.05)" }}
            />
            <Bar dataKey="out" stackId="a" name={t.tooltipOutperforming} fill={colorOut} radius={[0, 0, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={colorOut} />
              ))}
            </Bar>
            <Bar dataKey="under" stackId="a" name={t.tooltipUnderperforming} fill={colorUnder} radius={[4, 4, 0, 0]}>
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
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          <span>
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: colorOut, marginRight: 5, verticalAlign: "middle" }} />
            {t.tooltipOutperforming} (α) / {t.tooltipProfitable}
          </span>
          <span>
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: colorUnder, marginRight: 5, verticalAlign: "middle" }} />
            {t.tooltipUnderperforming} (α) / {t.tooltipUnprofitable}
          </span>
        </div>
      </div>
    </div>
  );
}
