import { NextRequest, NextResponse } from "next/server";
import { generateInsight } from "@/lib/ai";
import { getLatestSnapshot, getIndicatorSeries, getAllCountries, getLeaderboard } from "@/lib/db/queries";

export async function POST(req: NextRequest) {
  try {
    const { country = "IND", indicator, question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const snapshot = getLatestSnapshot(country);
    const countries = getAllCountries();
    const countryName = countries.find((c) => c.iso3 === country)?.name ?? country;

    let context = `Country: ${countryName} (${country})\n\n`;

    if (indicator && snapshot[indicator]) {
      const series = getIndicatorSeries(country, indicator);
      const latest = snapshot[indicator];
      context += `Indicator: ${indicator}\nLatest value (${latest.year}): ${latest.value}\n`;

      if (series.length > 0) {
        const years = series.filter((p) => p.value != null).map((p) => p.year);
        const values = series.filter((p) => p.value != null).map((p) => p.value!);
        if (values.length >= 2) {
          const trend = ((values[values.length - 1] - values[0]) / values[0] * 100).toFixed(1);
          context += `Trend (${years[0]}-${years[years.length - 1]}): ${trend}% change\n`;
        }
        const leaderboard = getLeaderboard(indicator, years[years.length - 1], 5);
        context += `Global rank in ${years[years.length - 1]}: #${leaderboard.findIndex((r) => r.iso3 === country) + 1} of ${leaderboard.length}\n`;
        context += `Top 5: ${leaderboard.slice(0, 5).map((r) => countries.find((c) => c.iso3 === r.iso3)?.name ?? r.iso3).join(", ")}\n`;
      }
    } else {
      const topKeys = Object.entries(snapshot).slice(0, 10);
      context += "Latest indicator snapshots:\n";
      for (const [key, val] of topKeys) {
        context += `  ${key}: ${val.value} (${val.year})\n`;
      }
    }

    const insight = await generateInsight(context, question);

    if (!insight) {
      return NextResponse.json({
        insight: null,
        note: "AI insights require GROQ_API_KEY in environment variables.",
      });
    }

    return NextResponse.json({ insight, country, indicator, question });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
