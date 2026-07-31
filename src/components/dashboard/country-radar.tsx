"use client";

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend,
} from "recharts";

type RadarRow = { category: string; Country: number; India: number };

export function CountryRadar({ data, countryName }: { data: RadarRow[]; countryName: string }) {
  if (data.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold">{countryName} vs India by category</h2>
        <p className="text-sm text-muted-foreground">
          Average percentile score (0–100) per category. A score of 50 = the median country.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid gridType="polygon" stroke="hsl(var(--muted))" />
          <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
          <Radar name={countryName} dataKey="Country" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
          <Radar name="India" dataKey="India" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
