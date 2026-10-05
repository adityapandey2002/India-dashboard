import { NextRequest, NextResponse } from "next/server";
import { getLatestSnapshot, getIndicatorSeries, getAllCountries, getLeaderboard } from "@/lib/db/queries";
import { chatDetailed, chatFailureMessage } from "@/lib/ai";

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
    // The missing-key case is handled by chatDetailed's failure taxonomy, so it
    // doesn't need its own (differently-worded) pre-check here.
    const { iso3 = "IND", year } = await req.json();
    if (typeof iso3 !== "string" || !/^[A-Z]{3}$/.test(iso3)) {
      return NextResponse.json({ error: "iso3 must be a 3-letter ISO code (e.g. IND)" }, { status: 400 });
    }

    const [snapshot, countries, co2Data, gdpData, hdiData, lifeExpData, leaderboard] = await Promise.all([
      getLatestSnapshot(iso3),
      getAllCountries(),
      getIndicatorSeries(iso3, "co2_per_capita"),
      getIndicatorSeries(iso3, "gdp_current_usd"),
      getIndicatorSeries(iso3, "hdi"),
      getIndicatorSeries(iso3, "life_expectancy"),
      getLeaderboard("gdp_current_usd", year ?? new Date().getFullYear(), 10, true),
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

    const result = await chatDetailed([{ role: "user", content: prompt }], { maxTokens: 300 });
    if (!result.ok) {
      // JSON.stringify so an upstream body can't inject newlines/ANSI into logs.
      console.error(
        "[api/ai/insights] groq call failed",
        JSON.stringify({
          reason: result.reason,
          status: result.status,
          model: result.model,
          detail: result.detail,
        }),
      );
      // 401/403/404 are configuration problems (key or model), not "AI is down";
      // only upstream 5xx/400 means we reached the provider and it failed.
      const status =
        result.reason === "rate-limited"
          ? 429
          : result.reason === "upstream-error" || result.reason === "bad-request"
            ? 502
            : 503;
      return NextResponse.json({ error: chatFailureMessage(result.reason) }, { status });
    }

    return NextResponse.json({ analysis: result.text });
  } catch (err) {
    console.error("[api/ai/insights]", err);
    return NextResponse.json({ error: "Failed to generate analysis" }, { status: 500 });
  }
}
