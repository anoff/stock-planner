import React from "react";
import type { PositionMetrics } from "../utils/types";
import { useTheme } from "../theme";
import { useLanguage } from "../i18n";

interface Props {
  metrics: PositionMetrics[];
  benchmark: string;
  /** When provided, rows become clickable to show/hide per-position research detail. */
  onSelectTicker?: (ticker: string | null) => void;
  /** The currently expanded ticker (yfTicker value). */
  selectedTicker?: string | null;
}

function fmtPct(val: number | null): string {
  if (val == null || !isFinite(val)) return "—";
  const abs = Math.abs(val * 100);
  const decimals = abs >= 5 ? 0 : 1;
  return `${val >= 0 ? "+" : ""}${(val * 100).toFixed(decimals)}%`;
}

function fmtPortfolioPct(val: number | null): string {
  if (val == null || !isFinite(val)) return "—";
  const pct = val * 100;
  return `${pct >= 5 ? pct.toFixed(0) : pct.toFixed(1)}%`;
}

function fmtMan(val: number): string {
  const man = val / 10000;
  return `${man >= 0 ? "+" : ""}${man.toFixed(1)}万`;
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
    "⬛ Closed":      "var(--text-muted)",
  };
  return map[signal] ?? "var(--text-muted)";
}

/** Unique row key — handles same-ticker multi-round closed positions via lastBuyDate. */
function rowKey(m: PositionMetrics): string {
  return m.signal === "⬛ Closed"
    ? `closed-${m.yfTicker}-${m.lastBuyDate.getTime()}`
    : m.yfTicker;
}

const MASKED = "• • •";

export default function MetricsTable({ metrics, benchmark, onSelectTicker, selectedTicker }: Props) {
  const { maskValues } = useTheme();
  const { t } = useLanguage();

  const totalPortfolioValue = metrics
    .filter((m) => m.signal !== "⬛ Closed")
    .reduce((sum, m) => sum + m.currentValue, 0);

  const HEADERS = [
    { label: t.colTicker,      align: "left"  },
    { label: t.colProfit,      align: "right" },
    { label: t.colPortfolioPct, align: "right" },
    { label: t.colAlphaCagr,   align: "right" },
    { label: t.colDaysHeld,    align: "right" },
    { label: t.colScore,       align: "right" },
    { label: t.colSignal,      align: "left"  },
  ] as const;
  const closed   = metrics.filter((m) => m.signal === "⬛ Closed");
  const active   = metrics.filter((m) => m.signal !== "⬛ Closed");
  const tooEarly = active.filter((m) => m.signal === "⏳ Too Early");
  const rest     = active.filter((m) => m.signal !== "⏳ Too Early");
  rest.sort((a, b) => b.cagr - a.cagr);
  tooEarly.sort((a, b) => b.totalReturn - a.totalReturn);
  closed.sort((a, b) => b.cagr - a.cagr);
  const sorted = [...rest, ...tooEarly, ...closed];

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
              {onSelectTicker && (
                <th className="research-table-expand-header" aria-label={t.clickToExpand}></th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, idx) => {
              const profit = m.currentValue - m.totalCost;
              const isTooEarlyStart = idx === rest.length && tooEarly.length > 0;
              const isClosedStart   = idx === rest.length + tooEarly.length && closed.length > 0;
              const isClosed        = m.signal === "⬛ Closed";
              const portfolioPct    = isClosed || totalPortfolioValue === 0
                ? null
                : m.currentValue / totalPortfolioValue;
              const isSelected      = onSelectTicker ? m.yfTicker === selectedTicker : false;
              return (
                <React.Fragment key={rowKey(m)}>
                  {isTooEarlyStart && (
                    <tr>
                      <td
                        colSpan={HEADERS.length + (onSelectTicker ? 1 : 0)}
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
                  {isClosedStart && (
                    <tr>
                      <td
                        colSpan={HEADERS.length + (onSelectTicker ? 1 : 0)}
                        style={{
                          padding: "5px 12px",
                          backgroundColor: "var(--accent-surface)",
                          color: "var(--text-muted)",
                          fontSize: 11,
                          fontStyle: "italic",
                          borderTop: "2px solid var(--border-strong)",
                        }}
                      >
                        {t.closedPositionsGroupLabel}
                      </td>
                    </tr>
                  )}
                  <tr
                    style={isClosed ? { opacity: 0.6 } : undefined}
                    className={onSelectTicker ? `research-table-row${isSelected ? " research-table-row--selected" : ""}` : undefined}
                    onClick={onSelectTicker ? () => onSelectTicker(isSelected ? null : m.yfTicker) : undefined}
                    title={onSelectTicker ? t.clickToExpand : undefined}
                  >
                    <td title={m.name} style={{ color: "var(--accent)", fontWeight: 600, fontSize: 12, textDecoration: isClosed ? "line-through" : undefined }}>
                      <div>{m.yfTicker}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400, marginTop: 1 }}>{m.name}</div>
                    </td>
                    <td className="col-right" style={{ color: maskValues ? "var(--text-muted)" : pctColor(profit), fontVariantNumeric: "tabular-nums" }}>
                      {maskValues ? MASKED : fmtMan(profit)}
                    </td>
                    <td className="col-right" style={{ color: "var(--text-muted)" }}>
                      {maskValues ? MASKED : fmtPortfolioPct(portfolioPct)}
                    </td>
                    <td className="col-right" style={{ color: pctColor(m.alphaCagr), fontWeight: 700 }}>
                      {fmtPct(m.alphaCagr)}
                    </td>
                    <td className="col-right" style={{ color: "var(--text-muted)" }}>
                      {m.daysHeld}
                    </td>
                    <td className="col-right" style={{ color: pctColor(isClosed ? null : m.fuzzyScore) }}>
                      {isClosed ? "—" : `${m.fuzzyScore >= 0 ? "+" : ""}${m.fuzzyScore.toFixed(2)}`}
                    </td>
                    <td style={{ color: signalColor(m.signal), fontWeight: 600 }}>
                      {t.signalLabels[m.signal] ?? m.signal}
                    </td>
                    {onSelectTicker && (
                      <td className="research-table-expand-cell" aria-hidden="true">
                        {isSelected ? "▾" : "›"}
                      </td>
                    )}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {onSelectTicker && (
        <p className="research-row-hint">{t.tapToExpand}</p>
      )}
    </div>
  );
}
