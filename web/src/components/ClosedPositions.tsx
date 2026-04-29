import { useState } from "react";
import type { ClosedPosition, PriceData } from "../utils/types";
import PositionChart from "./PositionChart";

interface Props {
  positions: ClosedPosition[];
  priceData: PriceData;
}

function fmtPct(val: number): string {
  return `${val >= 0 ? "+" : ""}${(val * 100).toFixed(1)}%`;
}

function fmtJpy(val: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(val);
}

function pctColor(val: number): string {
  return val >= 0 ? "var(--positive)" : "var(--negative)";
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Stable per-row key: ticker + last-sell timestamp handles same-ticker multi-rounds. */
function rowKey(p: ClosedPosition): string {
  return `${p.yfTicker}-${p.lastSellDate.getTime()}`;
}

export default function ClosedPositions({ positions, priceData }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [chartsVisible, setChartsVisible] = useState(false);

  if (positions.length === 0) return null;

  return (
    <div style={{ margin: "32px 0" }}>
      <div
        className="closed-toggle"
        onClick={() => setExpanded((v) => !v)}
      >
        🗂️ Closed Positions ({positions.length})
        <span className="muted">{expanded ? "▲ hide" : "▼ show"}</span>
      </div>

      {expanded && (
        <>
          <div className="card" style={{ overflowX: "auto", marginBottom: 14 }}>
            <table className="metrics-table">
              <thead>
                <tr>
                  {[
                    "Name", "Ticker", "First Buy", "Last Sell",
                    "Days Held", "Profit", "Total Return", "CAGR",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const profit = p.totalSellProceeds - p.totalBuyCost;
                  return (
                    <tr key={rowKey(p)}>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>
                        {p.name}
                      </td>
                      <td style={{ color: "var(--accent)", fontWeight: 600, fontSize: 12 }}>
                        {p.yfTicker}
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{fmtDate(p.firstBuyDate)}</td>
                      <td style={{ color: "var(--text-muted)" }}>{fmtDate(p.lastSellDate)}</td>
                      <td className="col-right" style={{ color: "var(--text-muted)" }}>
                        {p.daysHeld}
                      </td>
                      <td className="col-right" style={{ color: pctColor(profit), fontVariantNumeric: "tabular-nums" }}>
                        {fmtJpy(profit)}
                      </td>
                      <td className="col-right" style={{ color: pctColor(p.totalReturn), fontWeight: 600 }}>
                        {fmtPct(p.totalReturn)}
                      </td>
                      <td className="col-right" style={{ color: pctColor(p.cagr) }}>
                        {fmtPct(p.cagr)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            className={`btn${chartsVisible ? " btn-active" : ""}`}
            onClick={() => setChartsVisible((v) => !v)}
            style={{ marginBottom: 12 }}
          >
            {chartsVisible ? "Hide Charts" : "📈 Show Charts"}
          </button>

          {chartsVisible && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
                gap: 16,
              }}
            >
              {positions.map((p) => (
                <div key={rowKey(p)} className="chart-card">
                  <PositionChart
                    name={p.name}
                    ticker={p.yfTicker}
                    priceHistory={priceData[p.yfTicker] ?? []}
                    buyDates={p.buyDates}
                    sellDates={p.sellDates}
                    startDate={new Date(p.firstBuyDate.getTime() - 30 * 24 * 60 * 60 * 1000)}
                    endDate={new Date(p.lastSellDate.getTime() + 30 * 24 * 60 * 60 * 1000)}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
