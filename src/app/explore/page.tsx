import { getIndicatorCoverage, getDashboardStats } from "@/lib/db/queries";
import { query } from "@/lib/db/client";
import { ExploreClient } from "./explore-client";

export default async function ExplorePage() {
  const coverage = getIndicatorCoverage();
  const stats = getDashboardStats();
  const categories = query<{ category: string }>(
    `SELECT DISTINCT category FROM indicators ORDER BY category`
  );

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-b from-blue-50/40 to-background dark:from-blue-950/20">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <h1 className="text-3xl font-semibold tracking-tight">Explore Indicators</h1>
          <p className="mt-2 text-muted-foreground">
            Browse all {stats.totalIndicators} indicators across 10 categories.
            {stats.totalDataPoints.toLocaleString()} total data points.
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <ExploreClient
          coverage={coverage.map((c) => ({
            ...c,
            dataPoints: Number(c.dataPoints),
            countriesWithData: Number(c.countriesWithData),
          }))}
          categories={categories.map((c) => c.category)}
        />
      </div>
    </main>
  );
}
