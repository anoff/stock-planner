import React from "react";
import type { PositionMetrics } from "../utils/types";
import { useTheme } from "../theme";
import { useLanguage } from "../i18n";

interface Props {
  metrics: PositionMetrics[];
  benchmark: string;
}

function fmtPct(val: number | null): string {
  if (val == null || !isFinite(val)) return "—";
  return `${val >= 0 ? "+" : ""}${(val * 100).toFixed(1)}%`;
}

function fmtJpy(val: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(val);
}

function pctColor(val: number | null): string {
  if (val == null) return "var(--text-muted)";
  return val >= 0 ? "var(--positive)" : "var(--negative)";
}

const signalColor = (signal: string): string => {
  const map: Record<string, string> = {
    "🟢 Hold":        "#22c55e",
    "🟣 Take Profit": "#a78bfa",
    "🔵 Buy More":    "#60a5fa",
    "🟡 Watch":       "#fbbf24",
    "🔴 Sell":        "#f87171",
    "⏳ Too Early":   "var(--text-muted)",
  };
  return map[signal] ?? "var(--text-muted)";
}

const MASKED = "• • •";

export default function MetricsTable({ metrics, benchmark }: Props) {
  const { maskValues } = useTheme();
  const { t } = useLanguage();

  const HEADERS = [
    { label: t.colName,        align: "left"  },
    { label: t.colProfit,      align: "right" },
    { label: t.colTicker,      align: "left"  },
    { label: t.colCagr,        align: "right" },
    { label: t.colAlphaCagr,   align: "right" },
    { label: t.col1m,          align: "right" },
    { label: t.col6m,          align: "right" },
    { label: t.colTotalReturn, align: "right" },
    { label: t.colDaysHeld,    align: "right" },
    { label: t.colScore,       align: "right" },
    { label: t.colSignal,      align: "left"  },
  ] as const;
  const tooEarly = metrics.filter((m) => m.signal === "⏳ Too Early");
  const rest     = metrics.filter((m) => m.signal !== "⏳ Too Early");
  rest.sort((a, b) => b.cagr - a.cagr);
  tooEarly.sort((a, b) => b.totalReturn - a.totalReturn);
  const sorted = [...rest, ...tooEarly];

  return (
    <div style={{ margin: "8px 0 32px" }}>
      <div className="section-title">
        {t.positionMetrics}
        <span className="muted">vs {benchmark}</span>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="metrics-table">
          <thead>
            <tr>
              {HEADERS.map((h) => (
                <th
                  key={h.label}
                  style={{ textAlign: h.align }}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, idx) => {
              const profit = m.currentValue - m.totalCost;
              const isTooEarlyStart = idx === rest.length && tooEarly.length > 0;
              return (
                <React.Fragment key={m.yfTicker}>
                  {isTooEarlyStart && (
                    <tr>
                      <td
                        colSpan={HEADERS.length}
                        style={{
                          padding: "5px 12px",
                          backgroundColor: "var(--accent-surface)",
                          color: "var(--text-muted)",
                          fontSize: 11,
                          fontStyle: "italic",
                          borderTop: "2px solid var(--border-strong)",
                        }}
                      >
                        {t.tooEarlyLabel}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>
                      {m.name}
                    </td>
                    <td className="col-right" style={{ color: maskValues ? "var(--text-muted)" : pctColor(profit), fontVariantNumeric: "tabular-nums" }}>
                      {maskValues ? MASKED : fmtJpy(profit)}
                    </td>
                    <td style={{ color: "var(--accent)", fontWeight: 600, fontSize: 12 }}>
                      {m.yfTicker}
                    </td>
                    <td className="col-right" style={{ color: pctColor(m.cagr) }}>
                      {fmtPct(m.cagr)}
                    </td>
                    <td className="col-right" style={{ color: pctColor(m.alphaCagr), fontWeight: 700 }}>
                      {fmtPct(m.alphaCagr)}
                    </td>
                    <td className="col-right" style={{ color: pctColor(m.ret1m) }}>
                      {fmtPct(m.ret1m)}
                    </td>
                    <td className="col-right" style={{ color: pctColor(m.ret6m) }}>
                      {fmtPct(m.ret6m)}
                    </td>
                    <td className="col-right" style={{ color: pctColor(m.totalReturn) }}>
                      {fmtPct(m.totalReturn)}
                    </td>
                    <td className="col-right" style={{ color: "var(--text-muted)" }}>
                      {m.daysHeld}
                    </td>
                    <td className="col-right" style={{ color: pctColor(m.fuzzyScore) }}>
                      {m.fuzzyScore >= 0 ? "+" : ""}{m.fuzzyScore.toFixed(2)}
                    </td>
                    <td style={{ color: signalColor(m.signal), fontWeight: 600 }}>
                      {t.signalLabels[m.signal] ?? m.signal}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
