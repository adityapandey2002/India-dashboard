"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, Cell,
} from "recharts";
import { Loader2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type IndicatorOpt = { id: string; name: string; category: string };

type ScatterPoint = {
  iso3: string;
  name: string;
  x: number;
  y: number;
  xYear: number;
  yYear: number;
};

type Props = {
  indicators: IndicatorOpt[];
  initialX?: string;
  initialY?: string;
};

export function fmtAxis(v: number): string {
  if (Math.abs(v) >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (Math.abs(v) >= 1e9)  return `${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6)  return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3)  return `${(v / 1e3).toFixed(1)}k`;
  if (Math.abs(v) >= 100)  return Math.round(v).toLocaleString();
  return Number(v.toFixed(2)).toLocaleString();
}

export function fmtVal(v: number): string {
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3)  return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return Number(v.toFixed(2)).toLocaleString();
}

export function percentile(points: ScatterPoint[], key: "x" | "y", value: number): number | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a[key] - b[key]);
  const idx = sorted.findIndex((p) => p[key] >= value);
  if (idx < 0) return null;
  return Math.round((idx / (sorted.length - 1)) * 100);
}

type ScatterTooltipProps = {
  active?: boolean;
  payload?: { payload: ScatterPoint }[];
  xLabel: string;
  yLabel: string;
};

export function ScatterTooltip({ active, payload, xLabel, yLabel }: ScatterTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as ScatterPoint | undefined;
  if (!p) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{p.name} ({p.iso3})</div>
      <div>{xLabel}: <span className="font-semibold">{fmtVal(p.x)}</span> <span className="text-muted-foreground">({p.xYear})</span></div>
      <div>{yLabel}: <span className="font-semibold">{fmtVal(p.y)}</span> <span className="text-muted-foreground">({p.yYear})</span></div>
    </div>
  );
}

export function ScatterCard({ indicators, initialX, initialY }: Props) {
  const [xId, setXId] = useState(initialX ?? "gdp_per_capita");
  const [yId, setYId] = useState(initialY ?? "innovation_idx");
  const [points, setPoints] = useState<ScatterPoint[]>([]);
  const [meta, setMeta] = useState<{ x: string; y: string }>({ x: "", y: "" });
  const [correlation, setCorrelation] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byCategory = useMemo(() => {
    const map = new Map<string, IndicatorOpt[]>();
    for (const ind of indicators) {
      if (!map.has(ind.category)) map.set(ind.category, []);
      map.get(ind.category)!.push(ind);
    }
    return [...map.entries()];
  }, [indicators]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/scatter?x=${encodeURIComponent(xId)}&y=${encodeURIComponent(yId)}`);
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        if (cancelled) return;
        setPoints(json.points ?? []);
        setMeta({ x: json.x?.name ?? xId, y: json.y?.name ?? yId });
        setCorrelation(json.correlation);
      } catch {
        if (!cancelled) setError("Could not load scatter data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [xId, yId]);

  const india = points.find((p) => p.iso3 === "IND") ?? null;
  const others = points.filter((p) => p.iso3 !== "IND");
  const indiaXpct = india ? percentile(points, "x", india.x) : null;
  const indiaYpct = india ? percentile(points, "y", india.y) : null;

  const xName = meta.x || indicators.find((i) => i.id === xId)?.name || xId;
  const yName = meta.y || indicators.find((i) => i.id === yId)?.name || yId;

  const selectCls =
    "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm";

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-1 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">How does India compare?</h2>
          <p className="text-sm text-muted-foreground">
            Correlation of {xName} vs {yName} across countries.
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">Latest data</Badge>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">X axis</label>
          <select value={xId} onChange={(e) => setXId(e.target.value)} className={selectCls}>
            {byCategory.map(([cat, inds]) => (
              <optgroup key={cat} label={cat.replace(/_/g, " ")}>
                {inds.map((ind) => (
                  <option key={ind.id} value={ind.id}>{ind.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Y axis</label>
          <select value={yId} onChange={(e) => setYId(e.target.value)} className={selectCls}>
            {byCategory.map(([cat, inds]) => (
              <optgroup key={cat} label={cat.replace(/_/g, " ")}>
                {inds.map((ind) => (
                  <option key={ind.id} value={ind.id}>{ind.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading data...
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && (
        <>
          {correlation != null && (
            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="h-3 w-3" /> r = {correlation.toFixed(2)}
              </Badge>
              {india && indiaXpct != null && (
                <Badge variant="outline">
                  India {xName}: {fmtVal(india.x)} — beats {indiaXpct}% of {points.length} countries
                </Badge>
              )}
              {india && indiaYpct != null && (
                <Badge variant="outline">
                  India {yName}: {fmtVal(india.y)} — beats {indiaYpct}% of {points.length} countries
                </Badge>
              )}
            </div>
          )}

          <ResponsiveContainer width="100%" height={360}>
            <ScatterChart margin={{ top: 20, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                dataKey="x"
                name={xName}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={fmtAxis}
                label={{ value: xName, position: "insideBottom", offset: -4, fontSize: 11, className: "fill-muted-foreground" }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={yName}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={70}
                tickFormatter={fmtAxis}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={<ScatterTooltip xLabel={xName} yLabel={yName} />}
              />
              <Scatter name="Countries" data={others} fill="#3b82f6" fillOpacity={0.55} isAnimationActive={false}>
                {others.map((p) => (
                  <Cell key={p.iso3} fill="#3b82f6" fillOpacity={0.55} />
                ))}
              </Scatter>
              {india && (
                <Scatter name="India" data={[india]} fill="#f59e0b" isAnimationActive={false}>
                  <LabelList dataKey="name" position="top" className="fill-amber-500 text-xs font-semibold" />
                </Scatter>
              )}
            </ScatterChart>
          </ResponsiveContainer>

          <p className="mt-2 text-xs text-muted-foreground">
            Each dot is a country&apos;s most recent value for both indicators (may be different years). India is highlighted in amber.
          </p>
        </>
      )}
    </div>
  );
}
