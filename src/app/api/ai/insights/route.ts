import { NextRequest, NextResponse } from "next/server";
import { getLatestSnapshot, getIndicatorSeries, getAllCountries, getLeaderboard } from "@/lib/db/queries";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

function buildStatsPrompt(
  iso3: string,
  snapshot: Record<string, { value: number | null; year: number | null }>,
): string {
  const lines = [`Current metrics for ${iso3}:`];
  for (const [id, v] of Object.entries(snapshot)) {
    if (v.value != null) {
      lines.push(`  ${id}: ${v.value} (${v.year})`);
    }
  }
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { iso3 = "IND", year } = await req.json();
    const [snapshot, countries, co2Data, gdpData, hdiData, lifeExpData, leaderboard] = await Promise.all([
      getLatestSnapshot(iso3),
      getAllCountries(),
      getIndicatorSeries(iso3, "co2_per_capita"),
      getIndicatorSeries(iso3, "gdp_current_usd"),
      getIndicatorSeries(iso3, "hdi"),
      getIndicatorSeries(iso3, "life_expectancy"),
      getLeaderboard("gdp_current_usd", year ?? new Date().getFullYear(), 10),
    ]);

    const countryName = countries.find((c) => c.iso3 === iso3)?.name ?? iso3;

    // Build trend summaries
    const getTrend = (data: Array<{ year: number; value: number | null }>) => {
      const recent = data.filter((d) => d.value != null).slice(-3);
      if (recent.length < 2) return "insufficient data";
      if (recent[recent.length - 1].value! > recent[0].value!) return "upward trend";
      return "downward trend";
    };

    const prompt = `You are an expert data analyst analyzing ${countryName} (${iso3}).

${buildStatsPrompt(iso3, snapshot)}

Recent trends:
- GDP per capita: ${getTrend(gdpData)}
- HDI: ${getTrend(hdiData)}
- Life expectancy: ${getTrend(lifeExpData)}
- CO2 per capita: ${getTrend(co2Data)}

Top 3 global economies:
${leaderboard.slice(0, 3).map((r, i) => `  ${i + 1}. ${r.iso3}: $${(r.value ?? 0).toLocaleString()}`).join("\n")}

Provide a brief 3-sentence analysis of what these numbers mean together for ${countryName}.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
    });

    return NextResponse.json({ analysis: completion.choices[0]?.message?.content ?? "" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
