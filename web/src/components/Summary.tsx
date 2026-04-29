import type { PositionMetrics } from "../utils/types";

interface Props {
  metrics: PositionMetrics[];
  benchmark: string;
}

function fmtPct(val: number | null): string {
  if (val == null || !isFinite(val)) return "—";
  return `${val >= 0 ? "+" : ""}${(val * 100).toFixed(1)}%`;
}

function fmtPp(val: number | null): string {
  if (val == null || !isFinite(val)) return "—";
  return `${val >= 0 ? "+" : ""}${(val * 100).toFixed(1)}pp`;
}

function pctColor(val: number | null): string {
  if (val == null) return "var(--text-muted)";
  return val >= 0 ? "var(--positive)" : "var(--negative)";
}

export default function Summary({ metrics, benchmark }: Props) {
  const totalValue = metrics.reduce((s, m) => s + m.currentValue, 0);
  const totalCost  = metrics.reduce((s, m) => s + m.totalCost, 0);
  const totalReturn = totalCost > 0 ? (totalValue - totalCost) / totalCost : 0;
  const totalProfit = totalValue - totalCost;

  // Portfolio-level alpha (Python _broker_alpha_str style):
  // cost-weighted benchmark return vs portfolio total return, in percentage points
  let portfolioAlpha: number | null = null;
  {
    let weightedBmRet = 0;
    let weightSum = 0;
    for (const m of metrics) {
      if (m.bmRetBuy != null && m.totalCost > 0) {
        weightedBmRet += m.bmRetBuy * m.totalCost;
        weightSum += m.totalCost;
      }
    }
    if (weightSum > 0) {
      const portfolioBmRet = weightedBmRet / weightSum;
      portfolioAlpha = totalReturn - portfolioBmRet;
    }
  }

  // Outperformance % — positions with alphaCagr > 0, excluding "Too Early"
  const eligible = metrics.filter((m) => m.signal !== "⏳ Too Early" && m.alphaCagr != null);
  const outperforming = eligible.filter((m) => (m.alphaCagr ?? 0) > 0).length;
  const outperformPct = eligible.length > 0 ? outperforming / eligible.length : null;

  const signals = metrics.reduce(
    (acc, m) => {
      acc[m.signal] = (acc[m.signal] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const profitStr = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(totalProfit);

  const cards = [
    {
      label: "Positions",
      value: String(metrics.length),
      color: "var(--accent)",
      sub: null,
    },
    {
      label: "Total Profit",
      value: profitStr,
      color: pctColor(totalProfit),
      sub: null,
    },
    {
      label: "Total Return",
      value: fmtPct(totalReturn),
      color: pctColor(totalReturn),
      sub: null,
    },
    {
      label: "Portfolio Alpha",
      value: fmtPp(portfolioAlpha),
      color: pctColor(portfolioAlpha),
      sub: outperformPct != null
        ? `${Math.round(outperformPct * 100)}% outperforming vs ${benchmark}`
        : null,
    },
  ];

  return (
    <div style={{ margin: "24px 0" }}>
      <div className="section-title">📋 Portfolio Summary</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              flex: "1 1 160px",
              padding: "16px 20px",
              backgroundColor: "var(--bg-card)",
              borderRadius: 10,
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>
              {c.value}
            </div>
            {c.sub && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                {c.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 14,
          fontSize: 13,
        }}
      >
        {Object.entries(signals).map(([sig, count]) => (
          <span
            key={sig}
            style={{
              padding: "3px 12px",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 99,
              color: "var(--text-secondary)",
            }}
          >
            {sig}: <strong>{count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
