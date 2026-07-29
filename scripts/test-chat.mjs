import "dotenv/config";
import { vectorSearch } from "../src/lib/ai/vector-search.js";
import { chat } from "../src/lib/ai/client.js";

const question = "What is India GDP growth rate?";
console.log("Question:", question);

// Test vector search first
const results = await vectorSearch(question);
if (results && results.length > 0) {
  console.log(`\nVector search found ${results.length} chunks`);
  for (const r of results.slice(0, 3)) {
    console.log(`  [${r.score.toFixed(3)}] ${r.text.slice(0, 120)}`);
  }

  // Now test the full chat
  const contextText = results.slice(0, 10).map((c) => `[${c.id}] ${c.text}`).join("\n\n");
  const answer = await chat([
    { role: "system", content: "You are a data analyst. Answer concisely with citations like [source_id]." },
    { role: "user", content: `Context:\n${contextText}\n\nQuestion: ${question}\n\nAnswer with inline citations.` },
  ], { temperature: 0.2, maxTokens: 500 });

  console.log("\nAI Answer:", answer?.slice(0, 500));
} else {
  console.log("Vector search returned no results");
  console.log("Checking if embeddings table has data...");
  const { DatabaseSync } = await import("node:sqlite");
  const path = await import("node:path");
  const db = new DatabaseSync(path.default.join(process.cwd(), "data", "india.db"));
  const count = db.prepare("SELECT COUNT(*) as n FROM embeddings").all();
  console.log("Embeddings count:", count[0].n);
  const sample = db.prepare("SELECT chunk_text FROM embeddings LIMIT 3").all();
  console.log("Sample chunks:", sample.map(r => r.chunk_text));
  db.close();
}
