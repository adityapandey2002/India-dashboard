"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

type Series = {
  name: string;          // country / series label
  data: { year: number; value: number | null }[];
  color?: string;
};

type Props = {
  title: string;
  unit?: string;
  series: Series[];
  height?: number;
};

const DEFAULT_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

export function TrendChart({ title, unit, series, height = 320 }: Props) {
  // Merge all years across series
  const years = Array.from(
    new Set(series.flatMap((s) => s.data.map((d) => d.year))),
  ).sort((a, b) => a - b);

  const chartData = years.map((year) => {
    const row: Record<string, number | null> = { year };
    for (const s of series) {
      const point = s.data.find((d) => d.year === year);
      row[s.name] = point?.value ?? null;
    }
    return row;
  });

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            className="text-xs"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            className="text-xs"
            tick={{ fontSize: 11 }}
            width={60}
            tickFormatter={(v) => {
              if (Math.abs(v) >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
              if (Math.abs(v) >= 1e9)  return `${(v / 1e9).toFixed(1)}B`;
              if (Math.abs(v) >= 1e6)  return `${(v / 1e6).toFixed(1)}M`;
              if (Math.abs(v) >= 1e3)  return `${(v / 1e3).toFixed(1)}k`;
              return String(v);
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v) => {
              if (v == null || typeof v !== "number") return "—";
              return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              strokeWidth={s.name === "India" ? 3 : 1.5}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
