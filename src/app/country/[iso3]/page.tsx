import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Minus, Globe, Database, BarChart3, Calendar, Building2, Users, Shield, Zap, BookOpen, Stethoscope, Leaf, Heart, ArrowLeft } from "lucide-react";
import { getAllIndicators, getAllCountries, getLatestSnapshot, getIndicatorSeries, getRankInYear } from "@/lib/db/queries";

const ICONS: Record<string, any> = {
  economy: Building2, society: Users, governance: Shield,
  technology: Zap, education: BookOpen, healthcare: Stethoscope,
  environment: Leaf, safety: Shield, equality: Heart, digital_gov: Globe,
};

function Sparkline({ data }: { data: { year: number; value: number | null }[] }) {
  const pts = data.filter((d): d is { year: number; value: number } => d.value != null);
  if (pts.length < 2) return null;
  const vals = pts.map(d => d.value);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const rng = mx - mn || 1;
  const w = 80, h = 24;
  const px = (i: number) => (i / (pts.length - 1)) * w;
  const py = (v: number) => h - ((v - mn) / rng) * (h - 2) - 1;
  const d = vals.map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(0)},${py(v).toFixed(0)}`).join("");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function fmtValue(v: number | null, unit?: string | null): string {
  if (v == null) return "\u2014";
  let s: string;
  if (Math.abs(v) >= 1e12) s = `${(v / 1e12).toFixed(2)}T`;
  else if (Math.abs(v) >= 1e9) s = `${(v / 1e9).toFixed(2)}B`;
  else if (Math.abs(v) >= 1e6) s = `${(v / 1e6).toFixed(2)}M`;
  else if (Math.abs(v) >= 1e3) s = `${(v / 1e3).toFixed(1)}k`;
  else s = v.toFixed(unit === "%" ? 1 : 2);
  return unit ? `${s} ${unit}` : s;
}

export default async function CountryPage({ params }: { params: Promise<{ iso3: string }> }) {
  const { iso3 } = await params;
  const code = iso3.toUpperCase();

  const [countries, allIndicators] = await Promise.all([
    getAllCountries(),
    getAllIndicators(),
  ]);

  const country = countries.find((c) => c.iso3 === code);
  if (!country) notFound();

  const snapshot = await getLatestSnapshot(code);
  const categories = [...new Set(allIndicators.map((i) => i.category))];

  const data = await Promise.all(
    categories.map(async (cat) => {
      const catIndicators = allIndicators.filter((i) => i.category === cat);
      const entries = await Promise.all(
        catIndicators.map(async (ind) => {
          const val = snapshot[ind.id];
          const series = val?.year ? await getIndicatorSeries(code, ind.id) : [];
          const lastVal = val?.value ?? null;
          const year = val?.year ?? null;
          const rank = lastVal != null && year != null ? await getRankInYear(ind.id, code, year) : null;
          const prev = series.length >= 2 ? series[series.length - 2].value : null;
          let trend: { icon: any; color: string; label: string } | null = null;
          if (lastVal != null && prev != null && prev !== 0) {
            const pct = ((lastVal - prev) / Math.abs(prev)) * 100;
            if (Math.abs(pct) < 0.5) trend = { icon: Minus, color: "text-muted-foreground", label: "Stable" };
            else trend = pct > 0
              ? { icon: ArrowUpRight, color: "text-green-600", label: `+${pct.toFixed(1)}%` }
              : { icon: ArrowDownRight, color: "text-red-600", label: `${pct.toFixed(1)}%` };
          }
          return { ...ind, value: lastVal, year, rank, trend, series };
        })
      );
      return { category: cat, entries: entries.filter((e) => e.value != null) };
    })
  );

  const totalDataPoints = data.reduce((sum, c) => sum + c.entries.length, 0);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        {/* Back + Header */}
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{country.name}</h1>
              <p className="text-muted-foreground">
                {code} &middot; {country.region ?? "No region"} &middot; {totalDataPoints} indicators with data
              </p>
            </div>
            <Link href={`/compare?country=${code}`}>
              <Badge variant="outline" className="gap-1 cursor-pointer hover:border-amber-400">
                <BarChart3 className="h-3 w-3" />
                Compare
              </Badge>
            </Link>
          </div>
        </div>

        {/* Category Panels */}
        {data.map(({ category, entries }) => {
          if (entries.length === 0) return null;
          const Icon = ICONS[category] || Globe;
          return (
            <section key={category}>
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-5 w-5 text-amber-500" />
                <Link href={`/explore?category=${category}`} className="text-lg font-semibold capitalize hover:text-amber-600 transition-colors">{category.replace(/_/g, " ")}</Link>
                <span className="text-xs text-muted-foreground">({entries.length})</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/compare?indicator=${entry.id}`}
                    className="group rounded-lg border p-4 transition-colors hover:border-amber-400 hover:bg-amber-50/50 dark:hover:border-amber-600 dark:hover:bg-amber-950/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium group-hover:text-amber-700 dark:group-hover:text-amber-300">
                          {entry.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.id}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">{entry.unit ?? "index"}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-2xl font-bold tracking-tight">{fmtValue(entry.value, null)}</span>
                      <div className="flex items-center gap-2">
                        <Sparkline data={entry.series} />
                        {entry.trend && (
                          <div className="flex items-center gap-1">
                            <entry.trend.icon className={`${entry.trend.color} h-4 w-4`} />
                            <span className={`text-xs font-mono ${entry.trend.color}`}>{entry.trend.label}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {entry.year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {entry.year}
                        </span>
                      )}
                      {entry.rank && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          #{entry.rank.rank} of {entry.rank.total}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {entry.series.length} pts
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
