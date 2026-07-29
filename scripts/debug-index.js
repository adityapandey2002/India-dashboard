require("dotenv").config();
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const db = new DatabaseSync(path.join(__dirname, "..", "data", "india.db"));

// Check what indicator IDs are in the embeddings
const indicators = db.prepare(`
  SELECT indicator_id, COUNT(*) as cnt 
  FROM embeddings 
  WHERE embedding IS NOT NULL 
  GROUP BY indicator_id 
  ORDER BY cnt DESC 
  LIMIT 20
`).all();
console.log("Top indicators in embeddings:");
indicators.forEach(r => console.log(`  ${r.indicator_id}: ${r.cnt}`));

// Check vocabulary - extract unique terms from stored vectors
const sampleVecs = db.prepare(`
  SELECT embedding FROM embeddings WHERE embedding IS NOT NULL LIMIT 1000
`).all();

const allTerms = new Set();
for (const row of sampleVecs) {
  if (row.embedding) {
    try {
      const vec = JSON.parse(row.embedding.toString());
      Object.keys(vec).forEach(t => allTerms.add(t));
    } catch {}
  }
}
console.log(`\nSample vocabulary (${allTerms.size} unique terms):`);
console.log([...allTerms].sort().slice(0, 50));

// Check if 'gdp' or 'growth' exists
console.log("\nContains 'gdp':", allTerms.has("gdp"));
console.log("Contains 'growth':", allTerms.has("growth"));
console.log("Contains 'india':", allTerms.has("india"));
console.log("Contains 'ind':", allTerms.has("ind"));

// Check a specific indicator
const gdpChunks = db.prepare(`
  SELECT chunk_text FROM embeddings WHERE indicator_id = 'gdp_growth_pct' LIMIT 3
`).all();
console.log("\nGDP growth chunks:");
gdpChunks.forEach(r => console.log(`  ${r.chunk_text}`));

db.close();
