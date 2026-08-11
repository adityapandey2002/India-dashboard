import { NextRequest, NextResponse } from "next/server";
import { chat, type ChatMessage } from "@/lib/ai";
import { query } from "@/lib/db/client";
import { vectorSearch } from "@/lib/ai/vector-search";
import { INDIA_EVENTS } from "@/lib/historical-events";

const SYSTEM_PROMPT = `You are a data analyst for the "India in the World" dashboard. 
Answer questions about global development indicators with a focus on India.
Be concise, data-driven, and cite your sources using [source_id] format.
Only use the provided context. If information isn't in the context, say so.
Keep responses under 300 words.`;

type ContextChunk = {
  id: string;
  text: string;
  source: string;
};

/** Match the question against the historical-events library (with proof URLs). */
function eventChunksFor(question: string): ContextChunk[] {
  const q = question.toLowerCase();
  const chunks: ContextChunk[] = [];
  for (const ev of INDIA_EVENTS) {
    const label = ev.label.toLowerCase();
    const matches =
      (q.includes("covid") || q.includes("pandemic")) && label.includes("covid") ||
      (q.includes("demonetization") || q.includes("demonetisation") || q.includes("2016")) && label.includes("demonetization") ||
      (q.includes("liberalization") || q.includes("liberalisation") || q.includes("1991")) && label.includes("liberalization") ||
      (q.includes("jio") || q.includes("mobile data") || q.includes("internet boom")) && label.includes("jio") ||
      (q.includes("gst") || q.includes("tax reform")) && label.includes("gst") ||
      (q.includes("aadhaar")) && label.includes("aadhaar") ||
      (q.includes("paris") || q.includes("climate commitment") || q.includes("renewable")) && label.includes("paris") ||
      (q.includes("swachh") || q.includes("sanitation")) && label.includes("swachh") ||
      (q.includes("ayushman") || q.includes("health insurance")) && label.includes("ayushman") ||
      (q.includes("education policy") || q.includes(" nep")) && label.includes("education policy") ||
      (q.includes("mgnrega") || q.includes("rural employment")) && label.includes("employment");
    if (matches) {
      chunks.push({
        id: `event_${ev.year}_${ev.label.replace(/\s+/g, "_").toLowerCase()}`,
        text: `${ev.label} (${ev.year}): ${ev.description}`,
        source: ev.source,
      });
    }
  }
  return chunks;
}

async function buildContext(question: string): Promise<ContextChunk[]> {
  const chunks: ContextChunk[] = [];
  const lowerQ = question.toLowerCase();

  // 1. India-specific data
  if (lowerQ.includes("india")) {
    const indiaData = await query<{ indicator_id: string; value: number; year: number }>(
      `SELECT indicator_id, value, year FROM data_points 
       WHERE country_iso3 = 'IND' AND value IS NOT NULL 
       ORDER BY indicator_id, year`,
    );
    for (const row of indiaData) {
      chunks.push({
        id: `india_${row.indicator_id}_${row.year}`,
        text: `India ${row.indicator_id}: ${row.value} (year ${row.year})`,
        source: `data_point[IND:${row.indicator_id}:${row.year}]`,
      });
    }
  }

  // 2. Global comparison for specific indicators
  const indicatorKeywords = ["gdp", "hdi", "life expectancy", "internet", "co2", "education", "health", "governance", "innovation", "population", "urban", "trade", "patent", "mobile", "electricity", "hdi"];
  
  for (const keyword of indicatorKeywords) {
    if (lowerQ.includes(keyword)) {
      const indicators = await query<{ id: string; name: string }>(
        `SELECT id, name FROM indicators WHERE name LIKE ? OR id LIKE ?`,
        [`%${keyword}%`, `%${keyword}%`],
      );
      
      for (const ind of indicators.slice(0, 3)) {
        const leaderboard = await query<{ country_iso3: string; value: number; year: number }>(
          `SELECT country_iso3, value, year FROM data_points
           WHERE indicator_id = ? AND value IS NOT NULL
           ORDER BY year DESC, value DESC
           LIMIT 10`,
          [ind.id],
        );
        
        if (leaderboard.length > 0) {
          const latestYear = leaderboard[0].year;
          const top5 = leaderboard.filter((r) => r.year === latestYear).slice(0, 5);
          const indiaRank = top5.findIndex((r) => r.country_iso3 === "IND") + 1;
          
          chunks.push({
            id: `leaderboard_${ind.id}`,
            text: `${ind.name} (${ind.id}) global top 5 in ${latestYear}: ${top5.map((r, i) => `${i+1}. ${r.country_iso3}: ${r.value}`).join("; ")}. India rank: ${indiaRank || "not in top 5"}.`,
            source: `leaderboard[${ind.id}:${latestYear}]`,
          });
        }
      }
    }
  }

  // 3. Time series for trend questions
  if (lowerQ.includes("trend") || lowerQ.includes("improve") || lowerQ.includes("decline") || lowerQ.includes("change") || lowerQ.includes("over time")) {
    const indicatorMatches = lowerQ.match(/(gdp|hdi|life expectancy|internet|co2|education|health|population|urban|trade|patent|mobile|electricity)/g);
    if (indicatorMatches) {
      for (const kw of indicatorMatches) {
        const indicators = await query<{ id: string; name: string }>(
          `SELECT id, name FROM indicators WHERE name LIKE ? OR id LIKE ?`,
          [`%${kw}%`, `%${kw}%`],
        );
        
        for (const ind of indicators.slice(0, 2)) {
          const series = await query<{ country_iso3: string; year: number; value: number }>(
            `SELECT country_iso3, year, value FROM data_points
             WHERE indicator_id = ? AND country_iso3 IN ('IND','USA','CHN','BRA','ZAF') AND value IS NOT NULL
             ORDER BY country_iso3, year`,
            [ind.id],
          );
          
          if (series.length > 0) {
            const byCountry = new Map<string, typeof series>();
            for (const s of series) {
              if (!byCountry.has(s.country_iso3)) byCountry.set(s.country_iso3, []);
              byCountry.get(s.country_iso3)!.push(s);
            }
            
            for (const [iso3, pts] of byCountry) {
              if (pts.length >= 2) {
                const change = ((pts[pts.length - 1].value - pts[0].value) / pts[0].value * 100).toFixed(1);
                chunks.push({
                  id: `trend_${ind.id}_${iso3}`,
                  text: `${ind.name} (${ind.id}) ${iso3} ${pts[0].year}-${pts[pts.length - 1].year}: ${change}% change (${pts[0].value} → ${pts[pts.length - 1].value})`,
                  source: `series[${ind.id}:${iso3}]`,
                });
              }
            }
          }
        }
      }
    }
  }

  // 4. Historical events — matched from the events library (with proof URLs)
  chunks.push(...eventChunksFor(question));

  // 5. General country data
  const countryMatches = lowerQ.match(/\b(usa|china|brazil|south africa|japan|germany|france|uk|russia|india)\b/g);
  if (countryMatches) {
    for (const c of [...new Set(countryMatches)]) {
      const isoMap: Record<string, string> = {
        usa: "USA", china: "CHN", brazil: "BRA", "south africa": "ZAF",
        japan: "JPN", germany: "DEU", france: "FRA", uk: "GBR", russia: "RUS", india: "IND"
      };
      const iso3 = isoMap[c.toLowerCase()];
      if (iso3) {
        const snap = await query<{ indicator_id: string; value: number; year: number }>(
          `SELECT indicator_id, value, year FROM data_points 
           WHERE country_iso3 = ? AND value IS NOT NULL 
           ORDER BY indicator_id, year DESC LIMIT 15`,
          [iso3],
        );
        for (const row of snap) {
          chunks.push({
            id: `country_${iso3}_${row.indicator_id}`,
            text: `${iso3} ${row.indicator_id}: ${row.value} (${row.year})`,
            source: `data_point[${iso3}:${row.indicator_id}:${row.year}]`,
          });
        }
      }
    }
  }

  return chunks.slice(0, 50);
}

export async function POST(req: NextRequest) {
  try {
    const { question, conversationHistory } = await req.json();

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    // Try vector search first, fall back to keyword-based context
    let contextChunks: ContextChunk[] = [];

    const vectorResults = await vectorSearch(question);

    if (vectorResults) {
      contextChunks = vectorResults.map((r) => ({
        id: r.id,
        text: r.text,
        source: r.source,
      }));
    } else {
      contextChunks = await buildContext(question);
    }

    // Always include matched historical events (with proof URLs) — they are
    // not part of the TF-IDF index, and the vector search has no way to
    // surface them otherwise.
    contextChunks = [...contextChunks, ...eventChunksFor(question)];

    if (contextChunks.length === 0) {
      return NextResponse.json({
        answer: "I don't have relevant data for that question. Try asking about GDP, HDI, life expectancy, internet penetration, CO2 emissions, education, health, governance, or specific countries.",
        citations: [],
      });
    }

    const contextText = contextChunks.map((c) => `[${c.id}] ${c.text}`).join("\n\n");
    
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: `Context:\n${contextText}\n\nQuestion: ${question}\n\nAnswer with inline citations like [source_id].`,
      },
    ];

    const answer = await chat(messages, { temperature: 0.2, maxTokens: 1500 });

    if (!answer) {
      return NextResponse.json({
        answer: vectorResults
          ? "AI unavailable. Set GROQ_API_KEY in .env to enable AI responses."
          : "AI unavailable. Set GROQ_API_KEY to enable. (Vector search also needs HF_API_KEY for embeddings.)",
        citations: [],
      });
    }

    const citationIds = [...answer.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
    const citations = contextChunks
      .filter((c) => citationIds.includes(c.id))
      .map((c) => ({ id: c.id, source: c.source, text: c.text.slice(0, 200) }));

    return NextResponse.json({ answer, citations });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
