import type { RealizedEntry } from "../utils/types";
import { useTheme } from "../theme";
import { useLanguage } from "../i18n";

interface Props {
  entries: RealizedEntry[];
  baseCurrency: "EUR" | "JPY";
}

function fmtPct(val: number | null): string {
  if (val == null || !isFinite(val)) return "—";
  return `${val >= 0 ? "+" : ""}${(val * 100).toFixed(1)}%`;
}

function pctColor(val: number | null): string {
  if (val == null) return "var(--text-muted)";
  return val >= 0 ? "var(--positive)" : "var(--negative)";
}

const MASKED = "• • •";

export default function RealizedSummary({ entries, baseCurrency }: Props) {
  const { maskValues } = useTheme();
  const { t } = useLanguage();

  const totalRealizedPnl = entries.reduce((s, e) => s + e.realizedPnl, 0);

  const validCagrs = entries.filter((e) => isFinite(e.cagr));
  const avgCagr =
    validCagrs.length > 0
      ? validCagrs.reduce((s, e) => s + e.cagr, 0) / validCagrs.length
      : null;

  const winners = entries.filter((e) => e.realizedPnl > 0).length;
  const winRate = entries.length > 0 ? winners / entries.length : null;

  const pnlStr = new Intl.NumberFormat(
    baseCurrency === "EUR" ? "de-DE" : "ja-JP",
    {
      style: "currency",
      currency: baseCurrency,
      maximumFractionDigits: baseCurrency === "EUR" ? 2 : 0,
    }
  ).format(totalRealizedPnl);

  const cards = [
    {
      label: t.labelRealizedTrades,
      value: String(entries.length),
      color: "var(--accent)",
      sub: null,
    },
    {
      label: t.labelTotalRealizedPnl,
      value: maskValues ? MASKED : pnlStr,
      color: maskValues
        ? "var(--text-muted)"
        : pctColor(totalRealizedPnl),
      sub: null,
    },
    {
      label: t.labelAvgCagr,
      value: fmtPct(avgCagr),
      color: pctColor(avgCagr),
      sub: null,
    },
    {
      label: t.labelWinRate,
      value:
        winRate != null ? `${Math.round(winRate * 100)}%` : "—",
      color:
        winRate == null
          ? "var(--text-muted)"
          : winRate >= 0.5
          ? "var(--positive)"
          : "var(--negative)",
      sub:
        winRate != null
          ? `${winners} / ${entries.length}`
          : null,
    },
  ];

  return (
    <div style={{ margin: "8px 0 16px" }}>
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
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              {c.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>
              {c.value}
            </div>
            {c.sub && (
              <div
                style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}
              >
                {c.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
