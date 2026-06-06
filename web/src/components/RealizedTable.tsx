import type { RealizedEntry } from "../utils/types";
import { useTheme } from "../theme";
import { useLanguage } from "../i18n";

interface Props {
  entries: RealizedEntry[];
  benchmark: string;
  baseCurrency: "EUR" | "JPY";
}

function fmtPct(val: number | null): string {
  if (val == null || !isFinite(val)) return "—";
  const abs = Math.abs(val * 100);
  const decimals = abs >= 5 ? 0 : 1;
  return `${val >= 0 ? "+" : ""}${(val * 100).toFixed(decimals)}%`;
}

function fmtAmount(val: number, currency: "EUR" | "JPY"): string {
  if (currency === "JPY") {
    const man = val / 10000;
    return `${man >= 0 ? "+" : ""}${man.toFixed(1)}万`;
  }
  const k = val / 1000;
  return `${k >= 0 ? "+" : ""}${k.toFixed(1)}k`;
}

function fmtAmountAbs(val: number, currency: "EUR" | "JPY"): string {
  if (currency === "JPY") {
    return `${(val / 10000).toFixed(1)}万`;
  }
  return `${(val / 1000).toFixed(1)}k`;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pctColor(val: number | null): string {
  if (val == null) return "var(--text-muted)";
  return val >= 0 ? "var(--positive)" : "var(--negative)";
}

const MASKED = "• • •";

export default function RealizedTable({
  entries,
  benchmark,
  baseCurrency,
}: Props) {
  const { maskValues } = useTheme();
  const { t } = useLanguage();

  if (entries.length === 0) return null;

  return (
    <div style={{ margin: "8px 0 32px" }}>
      <div className="section-title">
        {t.realizedTableTitle}
        <span className="muted"> vs {benchmark}</span>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="metrics-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>{t.colTicker}</th>
              <th style={{ textAlign: "left" }}>{t.colType}</th>
              <th style={{ textAlign: "right" }}>{t.colFirstBuy}</th>
              <th style={{ textAlign: "right" }}>{t.colSellDate}</th>
              <th style={{ textAlign: "right" }}>{t.colDaysHeld}</th>
              <th style={{ textAlign: "right" }}>
                {t.colCost} [{baseCurrency}]
              </th>
              <th style={{ textAlign: "right" }}>
                {t.colProceeds} [{baseCurrency}]
              </th>
              <th style={{ textAlign: "right" }}>
                {t.colProfit} [{baseCurrency}]
              </th>
              <th style={{ textAlign: "right" }}>{t.colTotalReturn}</th>
              <th style={{ textAlign: "right" }}>{t.colCagr}</th>
              <th style={{ textAlign: "right" }}>{t.colAlphaCagr}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, idx) => {
              const isFull = e.type === "full";
              return (
                <tr key={`realized-${e.yfTicker}-${e.sellDate.getTime()}-${idx}`}>
                  <td
                    title={e.name}
                    style={{
                      color: "var(--accent)",
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    <div>{e.yfTicker}</div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        fontWeight: 400,
                        marginTop: 1,
                      }}
                    >
                      {e.name}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 99,
                        backgroundColor: isFull
                          ? "var(--accent-surface)"
                          : "var(--bg-surface)",
                        color: isFull
                          ? "var(--accent)"
                          : "var(--text-muted)",
                        border: "1px solid var(--border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isFull ? t.typeFull : t.typePartial}
                    </span>
                  </td>
                  <td
                    className="col-right"
                    style={{
                      color: "var(--text-muted)",
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtDate(e.firstBuyDate)}
                  </td>
                  <td
                    className="col-right"
                    style={{
                      color: "var(--text-secondary)",
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtDate(e.sellDate)}
                  </td>
                  <td
                    className="col-right"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {e.daysHeld}
                  </td>
                  <td
                    className="col-right"
                    style={{
                      color: "var(--text-muted)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {maskValues ? MASKED : fmtAmountAbs(e.cost, baseCurrency)}
                  </td>
                  <td
                    className="col-right"
                    style={{
                      color: "var(--text-muted)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {maskValues
                      ? MASKED
                      : fmtAmountAbs(e.proceeds, baseCurrency)}
                  </td>
                  <td
                    className="col-right"
                    style={{
                      color: maskValues
                        ? "var(--text-muted)"
                        : pctColor(e.realizedPnl),
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 600,
                    }}
                  >
                    {maskValues
                      ? MASKED
                      : fmtAmount(e.realizedPnl, baseCurrency)}
                  </td>
                  <td
                    className="col-right"
                    style={{
                      color: pctColor(e.totalReturn),
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtPct(e.totalReturn)}
                  </td>
                  <td
                    className="col-right"
                    style={{
                      color: pctColor(e.cagr),
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtPct(e.cagr)}
                  </td>
                  <td
                    className="col-right"
                    style={{
                      color: pctColor(e.alphaCagr),
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtPct(e.alphaCagr)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
