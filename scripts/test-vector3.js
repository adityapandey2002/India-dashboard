const { DatabaseSync } = require("node:sqlite");
const path = require("path");

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1 && !/^\d+$/.test(t));
}

const db = new DatabaseSync(path.join(process.cwd(), "data", "india.db"));

// Load ALL embeddings with chunk_text
const rows = db.prepare("SELECT chunk_text, embedding FROM embeddings WHERE embedding IS NOT NULL AND embedding != ''").all();
console.log("Total docs:", rows.length);

// Parse vectors and build IDF
const docFreq = new Map();
const docVectors = [];

for (const row of rows) {
  const obj = JSON.parse(row.embedding);
  const dv = new Map(Object.entries(obj));
  docVectors.push(dv);
  for (const term of dv.keys()) {
    docFreq.set(term, (docFreq.get(term) || 0) + 1);
  }
}

const numDocs = docVectors.length;
const idf = new Map();
for (const [term, df] of docFreq) {
  idf.set(term, Math.log((numDocs + 1) / (df + 1)) + 1);
}

// Build query vector
const query = "What is India GDP growth rate?";
const queryTokens = tokenize(query);
const tf = new Map();
for (const t of queryTokens) tf.set(t, (tf.get(t) || 0) + 1);

const queryVec = new Map();
for (const [term, freq] of tf) {
  queryVec.set(term, freq * (idf.get(term) || 1));
}

console.log("Query terms with weights:", [...queryVec.entries()].map(([t,w]) => `${t}=${w.toFixed(2)}`).join(", "));

// Score ALL docs
console.log("\nScoring...");
const scored = [];
for (let i = 0; i < docVectors.length; i++) {
  let dot = 0, normQ = 0, normD = 0;
  for (const [term, qw] of queryVec) {
    const dw = docVectors[i].get(term) || 0;
    dot += qw * dw;
    normQ += qw * qw;
  }
  for (const dw of docVectors[i].values()) normD += dw * dw;
  const denom = Math.sqrt(normQ) * Math.sqrt(normD);
  const sim = denom > 0 ? dot / denom : 0;
  if (sim > 0) scored.push({ i, sim });
}

scored.sort((a, b) => b.sim - a.sim);
console.log(`Matches found: ${scored.length} / ${docVectors.length}`);
scored.slice(0, 5).forEach((r, idx) => {
  console.log(`  ${idx+1}. score=${r.sim.toFixed(6)} | ${rows[r.i].chunk_text.slice(0, 120)}`);
});

db.close();
