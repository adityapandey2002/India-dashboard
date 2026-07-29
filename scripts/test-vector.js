const { DatabaseSync } = require("node:sqlite");
const path = require("path");

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1 && !/^\d+$/.test(t));
}

function cosineSimilarity(queryVec, docVec) {
  let dot = 0, normQ = 0, normD = 0;
  for (const [term, qw] of queryVec) {
    const dw = docVec.get(term) || 0;
    dot += qw * dw;
    normQ += qw * qw;
  }
  for (const dw of docVec.values()) normD += dw * dw;
  const denom = Math.sqrt(normQ) * Math.sqrt(normD);
  return denom > 0 ? dot / denom : 0;
}

const db = new DatabaseSync(path.join(process.cwd(), "data", "india.db"));

// Build IDF from all docs
const rows = db.prepare("SELECT embedding FROM embeddings WHERE embedding IS NOT NULL AND embedding != ''").all();
console.log("Total docs:", rows.length);

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

// Test query
const query = "What is India GDP growth rate?";
const queryTokens = tokenize(query);
console.log("Query tokens:", queryTokens);

const queryVec = new Map();
const tf = new Map();
for (const t of queryTokens) {
  tf.set(t, (tf.get(t) || 0) + 1);
}
for (const [term, freq] of tf) {
  queryVec.set(term, freq * (idf.get(term) || 1));
}
console.log("Query vector terms:", [...queryVec.keys()]);

// Score all docs
const scored = [];
for (let i = 0; i < docVectors.length; i++) {
  const sim = cosineSimilarity(queryVec, docVectors[i]);
  if (sim > 0) scored.push({ idx: i, score: sim });
}

scored.sort((a, b) => b.score - a.score);
console.log("\nTop 5 results:");
scored.slice(0, 5).forEach((r, i) => {
  const row = rows[r.idx];
  console.log(`  ${i+1}. score=${r.score.toFixed(4)} | ${row.chunk_text.slice(0, 100)}`);
});

db.close();
