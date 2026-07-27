import { BarChart3 } from "lucide-react";
import { CompareTool } from "@/components/dashboard/comparison-tool";
import { query } from "@/lib/db/client";

export default async function ComparePage() {
  const allCountries = query<{ iso3: string; name: string; region: string | null }>(
    `SELECT iso3, name, region FROM countries ORDER BY name`,
  );
  const allIndicators = query<{ id: string; name: string; category: string; unit: string | null }>(
    `SELECT id, name, category, unit FROM indicators ORDER BY category, name`,
  );
  const stats = query<{ totalIndicators: number; totalDataPoints: number }>(
    `SELECT (SELECT COUNT(*) FROM indicators) AS totalIndicators, (SELECT COUNT(*) FROM data_points) AS totalDataPoints`,
  );

  const countries = JSON.parse(JSON.stringify(allCountries));
  const indicators = JSON.parse(JSON.stringify(allIndicators));
  const indicatorsByCategory: Record<string, Array<{ id: string; name: string; category: string; unit: string | null }>> = {};
  for (const ind of indicators) {
    (indicatorsByCategory[ind.category] ??= []).push(ind);
  }
  const totalIndicators = stats[0]?.totalIndicators ?? 0;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-b from-blue-50/40 to-background dark:from-blue-950/20">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-muted-foreground">Compare</span>
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Country comparison
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Select countries and indicators to compare side by side across{" "}
            {totalIndicators} global metrics.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <CompareTool countries={countries} indicatorsByCategory={indicatorsByCategory} />
      </div>
    </main>
  );
}
