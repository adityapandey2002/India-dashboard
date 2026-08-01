import { getIndicatorCoverage, getDashboardStats } from "@/lib/db/queries";
import { RankingsClient } from "@/components/dashboard/rankings-client";

export const dynamic = "force-dynamic";

export default async function RankingsPage(props: { searchParams: Promise<{ indicator?: string }> }) {
  const { indicator } = await props.searchParams;
  const [coverage, stats] = await Promise.all([getIndicatorCoverage(), getDashboardStats()]);

  const indicators = coverage
    .filter((c) => c.dataPoints > 0)
    .map((c) => ({ id: c.indicatorId, name: c.indicatorName, category: c.category }));

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-b from-violet-50/40 to-background dark:from-violet-950/20">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <h1 className="text-3xl font-semibold tracking-tight">Global Rankings</h1>
          <p className="mt-2 text-muted-foreground">
            Pick an indicator to see every country ranked, with India highlighted.{" "}
            {stats.totalDataPoints.toLocaleString()} data points across{" "}
            {indicators.length} indicators.
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <RankingsClient indicators={indicators} initialId={indicator} />
      </div>
    </main>
  );
}
