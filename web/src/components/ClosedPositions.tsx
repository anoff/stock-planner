import { useState } from "react";
import type { ClosedPosition, PriceData } from "../utils/types";
import PositionChart from "./PositionChart";
import { useTheme } from "../theme";
import { useLanguage } from "../i18n";

interface Props {
  positions: ClosedPosition[];
  priceData: PriceData;
}

function fmtPct(val: number): string {
  const abs = Math.abs(val * 100);
  const decimals = abs >= 5 ? 0 : 1;
  return `${val >= 0 ? "+" : ""}${(val * 100).toFixed(decimals)}%`;
}

function fmtMan(val: number): string {
  const man = val / 10000;
  return `${man >= 0 ? "+" : ""}${man.toFixed(1)}万`;
}

function pctColor(val: number): string {
  return val >= 0 ? "var(--positive)" : "var(--negative)";
}

/** Stable per-row key: ticker + last-sell timestamp handles same-ticker multi-rounds. */
function rowKey(p: ClosedPosition): string {
  return `${p.yfTicker}-${p.lastSellDate.getTime()}`;
}

const MASKED = "• • •";

export default function ClosedPositions({ positions, priceData }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [chartsVisible, setChartsVisible] = useState(false);
  const { maskValues } = useTheme();
  const { t } = useLanguage();

  if (positions.length === 0) return null;

  return (
    <div style={{ margin: "32px 0" }}>
      <div
        className="closed-toggle"
        onClick={() => setExpanded((v) => !v)}
      >
        {t.closedPositions(positions.length)}
        <span className="muted">{expanded ? t.hide : t.show}</span>
      </div>

      {expanded && (
        <>
          <div className="card" style={{ overflowX: "auto", marginBottom: 14 }}>
            <table className="metrics-table">
              <thead>
                <tr>
                  {[
                    t.colTicker, t.colDaysHeld, t.colProfit, t.colTotalReturn, t.colCagr,
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
                      <td title={p.name} style={{ color: "var(--accent)", fontWeight: 600, fontSize: 12 }}>
                        {p.yfTicker}
                      </td>
                      <td className="col-right" style={{ color: "var(--text-muted)" }}>
                        {p.daysHeld}
                      </td>
                      <td className="col-right" style={{ color: maskValues ? "var(--text-muted)" : pctColor(profit), fontVariantNumeric: "tabular-nums" }}>
                        {maskValues ? MASKED : fmtMan(profit)}
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
            {chartsVisible ? t.hideCharts : t.showCharts}
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
