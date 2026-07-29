/**
 * Quick test: runs the chat endpoint logic in-process to verify
 * vector search + Groq integration.
 */
require("dotenv").config();
const { DatabaseSync } = require("node:sqlite");
const path = require("path");

// Patch the db client to use the correct path
process.env.DATABASE_PATH = path.join(__dirname, "..", "data", "india.db");

async function main() {
  // Test 1: vector search
  console.log("=== Test 1: Vector search ===");
  const { vectorSearch } = require("../src/lib/ai/vector-search");
  const results = await vectorSearch("What is India GDP growth rate?");
  if (results && results.length > 0) {
    console.log(`Found ${results.length} results`);
    results.slice(0, 3).forEach((r, i) =>
      console.log(`  ${i + 1}. score=${r.score.toFixed(4)} | ${r.text.slice(0, 100)}`)
    );
  } else {
    console.log("No results from vector search");
  }

  // Test 2: direct Groq test
  console.log("\n=== Test 2: Groq API ===");
  const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
  const res = await fetch(GROQ_API, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.GROQ_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a data analyst for the India in the World dashboard. Answer about global development indicators with a focus on India. Be concise and cite sources.",
        },
        {
          role: "user",
          content: `Context:
[vec_gdp_growth_pct_IND_2024] GDP growth (annual %) (gdp_growth_pct) for IND in 2024: 7.2 %

Question: What is India GDP growth rate?

Answer with inline citations like [source_id].`,
        },
      ],
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  if (res.ok) {
    const body = await res.json();
    console.log("Answer:", body.choices?.[0]?.message?.content?.slice(0, 500));
  } else {
    const text = await res.text();
    console.log("Groq error:", res.status, text.slice(0, 300));
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
