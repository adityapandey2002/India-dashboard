import { NextRequest, NextResponse } from "next/server";
import { getRankingsForIndicator, getIndicatorSeries, getIndicator, getAllCountries } from "@/lib/db/queries";
import { computeRankings, computeRankHistory } from "@/lib/rankings";
import { isHigherBetter } from "@/lib/rank-direction";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const indicatorId = searchParams.get("indicator");
  if (!indicatorId) {
    return NextResponse.json({ error: "indicator parameter is required" }, { status: 400 });
  }

  const [indicator, latest, countries] = await Promise.all([
    getIndicator(indicatorId),
    getRankingsForIndicator(indicatorId),
    getAllCountries(),
  ]);
  if (!indicator) {
    return NextResponse.json({ error: "unknown indicator" }, { status: 404 });
  }

  const higherIsBetter = isHigherBetter(indicatorId);
  const ranking = computeRankings(latest, higherIsBetter);
  const indiaRow = ranking.find((r) => r.iso3 === "IND") ?? null;

  const indiaSeries = (await getIndicatorSeries("IND", indicatorId))
    .filter((p) => p.value != null)
    .map((p) => ({ year: p.year, value: p.value! }));
  const history = computeRankHistory(indiaSeries, higherIsBetter);

  const nameByIso = new Map(countries.map((c) => [c.iso3, c.name]));

  return NextResponse.json({
    indicator: {
      id: indicator.id,
      name: indicator.name,
      unit: indicator.unit,
      category: indicator.category,
      description: indicator.description,
    },
    higherIsBetter,
    ranking,
    india: indiaRow,
    history,
    names: Object.fromEntries(nameByIso),
  });
}
