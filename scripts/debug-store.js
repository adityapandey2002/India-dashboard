require("dotenv").config();
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const db = new DatabaseSync(path.join(__dirname, "..", "data", "india.db"));

const row = db.prepare("SELECT chunk_text, embedding FROM embeddings WHERE indicator_id = 'gdp_growth_pct' LIMIT 1").all()[0];
if (!row) { console.log("No row found"); process.exit(0); }

console.log("Embedding is Buffer:", Buffer.isBuffer(row.embedding));
console.log("Embedding length:", row.embedding?.length);
if (row.embedding && row.embedding.length > 0) {
  const str = row.embedding.toString("utf-8");
  console.log("Content:", str.slice(0, 300));
  try {
    const obj = JSON.parse(str);
    console.log("Keys:", Object.keys(obj));
    console.log("Values:", Object.values(obj).slice(0, 5));
  } catch(e) {
    console.log("JSON parse error:", e.message);
  }
} else {
  console.log("Embedding is empty or null");
}

// Also check how the index script built it - re-run the tokenizer on the chunk
const text = row.chunk_text;
console.log("\nChunk text:", text);
const tokens = text.toLowerCase()
  .replace(/[^a-z0-9\s]/g, " ")
  .split(/\s+/)
  .filter(t => t.length > 1 && !/^\d+$/.test(t));
console.log("Tokens:", tokens);

db.close();
