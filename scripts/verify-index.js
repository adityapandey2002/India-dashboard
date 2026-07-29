const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const db = new DatabaseSync(path.join(process.cwd(), "data", "india.db"));

// Check stored embedding content
const row = db.prepare("SELECT chunk_text, embedding FROM embeddings WHERE indicator_id = 'gdp_growth_pct' LIMIT 1").all()[0];
console.log("Embedding type:", typeof row.embedding);
if (row.embedding && row.embedding.length > 5) {
  console.log("Embedding preview:", row.embedding.slice(0, 100));
  try {
    const obj = JSON.parse(row.embedding);
    console.log("Keys:", Object.keys(obj));
    console.log("Terms:", Object.keys(obj).slice(0, 15).join(", "));
  } catch(e) {
    console.log("JSON parse error:", e.message);
  }
}

// Count how many have non-empty embeddings
const nonEmpty = db.prepare("SELECT COUNT(*) as n FROM embeddings WHERE embedding IS NOT NULL AND embedding != ''").all()[0];
console.log("Non-empty embeddings:", nonEmpty.n);

// Check tokenization
const text = "GDP growth (annual %) (gdp_growth_pct) for IND in 2024: 7.2";
const tokens = text.toLowerCase()
  .replace(/[^a-z0-9\s]/g, " ")
  .split(/\s+/)
  .filter(t => t.length > 1 && !/^\d+$/.test(t));
console.log("Token test:", tokens);

db.close();
