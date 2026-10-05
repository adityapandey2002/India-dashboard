export const dynamic = "force-dynamic";

import Link from "next/link";
import { BookOpen, Database, Globe, Calculator, BarChart3, FileText, Scale, LineChart, Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats, getAllCountries, getIndicatorCoverage } from "@/lib/db/queries";

const SOURCES = [
  { org: "World Bank", what: "GDP, poverty, health, education, infrastructure, trade, governance indicators — the backbone of most dashboards.", url: "https://data.worldbank.org", how: "National statistics offices report to the World Bank, which harmonizes definitions and adjusts for comparability across countries and years." },
  { org: "UNDP", what: "Human Development Index (HDI), inequality-adjusted HDI, Gender Inequality Index, education indices.", url: "https://hdr.undp.org", how: "Composite indices built from UN agency data (life tables, education stats, GDP) normalized to 0–1 against fixed minimum/maximum bounds." },
  { org: "WHO", what: "Health coverage, life expectancy, vaccination rates, road safety, mortality.", url: "https://www.who.int/data", how: "Member states submit health statistics; WHO models estimates when national data is incomplete (e.g. maternal mortality)." },
  { org: "Our World in Data (OWID)", what: "CO2 emissions, energy mix, air quality, patents.", url: "https://ourworldindata.org", how: "Aggregates academic datasets (Global Carbon Budget, Ember, IHME) into tidy CSV files updated annually." },
  { org: "Worldwide Governance Indicators (WGI)", what: "Government effectiveness, rule of law, corruption control, voice & accountability.", url: "https://www.worldbank.org/en/publication/worldwide-governance-indicators", how: "Aggregates ~30 expert and survey sources using an unobserved-components model to produce a −2.5 to +2.5 scale." },
  { org: "Transparency International", what: "Corruption Perceptions Index.", url: "https://www.transparency.org/en/cpi", how: "Combines 13 expert assessments and business surveys into a 0–100 perceived-corruption score." },
  { org: "Numbeo", what: "Cost of living, quality of life, safety, healthcare, crime indices.", url: "https://www.numbeo.com", how: "User-contributed price and survey data aggregated per city and country (New York = 100 baseline)." },
  { org: "UN E-Government Survey", what: "E-Government Development Index.", url: "https://publicadministration.un.org/egovkb", how: "Weighted average of online services, telecom infrastructure and human capital components (0–1)." },
];

const SCORING = [
  { step: "Collect the data", detail: "Each indicator is fetched from its source's public API, CSV or XLSX — the pipeline runs `npm run ingest` and stores raw country-year-value rows in the database (118+ indicators, 250k+ data points, 217 countries)." },
  { step: "Pick the latest year per country", detail: "Countries report in different years. For 'latest value' views we use each country's most recent available year for that indicator, so nothing is thrown away." },
  { step: "Rank countries", detail: "Rankings use competition ranking: equal values share the same rank (e.g. two countries at rank 3, next at 5). Ties keep the 'of N' denominator as the total number of countries with data." },
  { step: "Score 0–100", detail: "A country's percentile-based score is derived from its rank: score = 100 × (1 − (rank − 1) / total). Rank 1 of 100 → 100 points; last place → ~1 point. The Rankings page shows a true percentile instead — 100 × (total − rank) / (total − 1), where the best country is 100th and the last is 0th." },
  { step: "Grade A–F", detail: "Category and overall scores map to letter grades: A ≥ 85, B ≥ 70, C ≥ 55, D ≥ 40, F < 40. Grades are computed from percentile rank, not raw values — so a low raw value can still earn a good grade if it beats most countries." },
  { step: "Direction matters", detail: "Some indicators are 'lower is better' (mortality, pollution, inequality, crime, debt). The dashboard knows 25+ such indicators and flips their interpretation everywhere — trend arrows, deltas and 'better/worse' labels." },
];

export default async function MethodologyPage() {
  const [stats, countries, coverage] = await Promise.all([
    getDashboardStats(),
    getAllCountries(),
    getIndicatorCoverage(),
  ]);

  const withData = coverage.filter((c) => c.dataPoints > 0).length;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8 sm:px-6">
        {/* Header */}
        <header className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-medium text-muted-foreground">Methodology</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">How indicators are calculated</h1>
          <p className="max-w-2xl text-muted-foreground">
            Every number on this dashboard comes from a public international source. This page explains
            where the data comes from, how it is scored and ranked, and how you can verify it yourself.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="gap-1"><Database className="h-3 w-3" /> {stats.totalDataPoints.toLocaleString()} data points</Badge>
            <Badge variant="secondary" className="gap-1"><BarChart3 className="h-3 w-3" /> {withData}/{stats.totalIndicators} indicators</Badge>
            <Badge variant="secondary" className="gap-1"><Globe className="h-3 w-3" /> {stats.totalCountries} countries</Badge>
          </div>
        </header>

        {/* Sources */}
        <section>
          <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
            <Landmark className="h-5 w-5 text-amber-500" /> Data sources
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {SOURCES.map((s) => (
              <Card key={s.org}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-amber-600">{s.org}</a>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p><span className="font-medium text-foreground">Provides:</span> {s.what}</p>
                  <p><span className="font-medium text-foreground">How:</span> {s.how}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Scoring pipeline */}
        <section>
          <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-amber-500" /> From raw data to a grade
          </h2>
          <Card>
            <CardContent className="p-6 space-y-5">
              {SCORING.map((s, i) => (
                <div key={s.step} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-medium">{s.step}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{s.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Reading the dashboard */}
        <section>
          <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
            <Scale className="h-5 w-5 text-amber-500" /> How to read the charts
          </h2>
          <Card>
            <CardContent className="p-6 grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-2 font-medium"><LineChart className="h-4 w-4 text-blue-500" /> Trend charts</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Each line is one country over time. Gaps mean no data for that year. India is drawn thicker (amber).
                  A dotted purple line marks a major historical event that likely influenced the trend.
                </p>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-medium"><Globe className="h-4 w-4 text-blue-500" /> World maps</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Color intensity shows value — darker means higher. Grey means no data for that country-year.
                  Use the year selector to watch the world change over time.
                </p>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4 text-blue-500" /> Report card</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  India is scored 0–100 per category based on its global percentile rank for each indicator, then graded A–F.
                  Expand a section to see the individual indicators behind the score.
                </p>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-medium"><Database className="h-4 w-4 text-blue-500" /> Indicator pages</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every indicator has its own page (e.g. <Link href="/indicator/hdi" className="text-blue-500 hover:underline">/indicator/hdi</Link>) with a plain-language
                  explanation, the calculation method, sources and events that explain the numbers.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Caveats */}
        <section>
          <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-500" /> Important caveats
          </h2>
          <Card>
            <CardContent className="p-6 space-y-3 text-sm text-muted-foreground">
              <p>• <span className="font-medium text-foreground">Latest year varies by indicator.</span> GDP data is ~1 year old; indices like HDI are ~2 years old. Each page shows the year used.</p>
              <p>• <span className="font-medium text-foreground">Estimates vs surveys.</span> Some figures (maternal mortality, literacy) are model estimates or self-reported — treat small differences between countries with caution.</p>
              <p>• <span className="font-medium text-foreground">Discontinued series.</span> A few sources stopped publishing (e.g. World Bank Doing Business in 2021, WEF Global Competitiveness in 2019). Their data ends at the last available year.</p>
              <p>• <span className="font-medium text-foreground">Currency.</span> Dollar figures use market exchange rates unless marked PPP, which uses purchasing-power conversion for true living-standard comparisons.</p>
              <p>• <span className="font-medium text-foreground">Verify yourself.</span> Every indicator page links to the original source. The AI chat cites specific data points you can check.</p>
            </CardContent>
          </Card>
        </section>

        {/* Footer link */}
        <div className="border-t pt-6 text-sm text-muted-foreground">
          Want a specific indicator explained? Visit the <Link href="/explore" className="text-blue-500 hover:underline">Explore page</Link> and click any indicator.
        </div>
      </div>
    </main>
  );
}
