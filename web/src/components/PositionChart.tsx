import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { PriceHistory } from "../utils/types";
import { useTheme } from "../theme";

interface Props {
  name: string;
  ticker: string;
  priceHistory: PriceHistory;
  buyDates: Date[];
  sellDates?: Date[];
  startDate?: Date;
  endDate?: Date;
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    year: "2-digit",
    month: "short",
  });
}

export default function PositionChart({
  name,
  ticker,
  priceHistory,
  buyDates,
  sellDates = [],
  startDate,
  endDate,
}: Props) {
  const { chart } = useTheme();

  if (!priceHistory || priceHistory.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 12, padding: "8px 0" }}>
        No price data available for {ticker}
      </div>
    );
  }

  const effectiveEnd = endDate ?? new Date();
  const fiveYearsAgo = new Date(effectiveEnd.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
  const defaultStart = buyDates.length > 0
    ? new Date(Math.min(
        Math.min(...buyDates.map((d) => d.getTime())) - 30 * 24 * 60 * 60 * 1000,
        fiveYearsAgo.getTime()
      ))
    : fiveYearsAgo;
  const effectiveStart = startDate ?? defaultStart;

  const data = priceHistory
    .filter((r) => r.date >= effectiveStart && r.date <= effectiveEnd)
    .map((r) => ({ x: r.date.getTime(), close: r.close }));

  if (data.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 12, padding: "8px 0" }}>
        No price data in range for {ticker}
      </div>
    );
  }

  const prices  = data.map((d) => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding  = (maxPrice - minPrice) * 0.1 || 1;
  const yDomain  = [minPrice - padding, maxPrice + padding];

  return (
    <div style={{ margin: "4px 0 8px" }}>
      {/* Title */}
      <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 600, color: "var(--text)" }}>
        {name}{" "}
        <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 11 }}>
          {ticker}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
          <XAxis
            dataKey="x"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={fmtDate}
            tick={{ fill: chart.axisText, fontSize: 10 }}
            axisLine={{ stroke: chart.grid }}
            tickLine={false}
            tickCount={5}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)
            }
            tick={{ fill: chart.axisText, fontSize: 10 }}
            axisLine={{ stroke: chart.grid }}
            tickLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: chart.tooltipBg,
              border: `1px solid ${chart.tooltipBorder}`,
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            }}
            labelStyle={{ color: chart.tooltipMuted, fontSize: 11, marginBottom: 4 }}
            itemStyle={{ color: chart.tooltipText }}
            formatter={(value) => {
              const num = typeof value === "number" ? value : Number(value);
              return [isNaN(num) ? "—" : num.toFixed(2), "Price"] as [string, string];
            }}
            labelFormatter={(label) => {
              const ts = typeof label === "number" ? label : Number(label);
              return new Date(ts).toLocaleDateString("en-GB", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
            }}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke={chart.line}
            dot={false}
            strokeWidth={2}
          />
          {buyDates.map((d, i) => (
            <ReferenceLine
              key={`buy-${i}`}
              x={d.getTime()}
              stroke="#22c55e"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{ value: "B", position: "top", fill: "#22c55e", fontSize: 9, fontWeight: 700 }}
            />
          ))}
          {sellDates.map((d, i) => (
            <ReferenceLine
              key={`sell-${i}`}
              x={d.getTime()}
              stroke="#f87171"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{ value: "S", position: "top", fill: "#f87171", fontSize: 9, fontWeight: 700 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
