/**
 * Local text indexer — builds a searchable index of data point chunks
 * using TF-IDF weights. No external API needed.
 *
 * Run: npm run index-embeddings
 */

import "dotenv/config";
import { getDb, query, execute } from "../src/lib/db/client";

type DataPoint = {
  indicator_id: string;
  indicator_name: string;
  country_iso3: string;
  year: number;
  value: number;
  unit: string | null;
};

function buildChunkText(dp: DataPoint): string {
  const unit = dp.unit ? ` ${dp.unit}` : "";
  return `${dp.indicator_name} (${dp.indicator_id}) for ${dp.country_iso3} in ${dp.year}: ${dp.value}${unit}`;
}

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !/^\d+$/.test(t));
}

async function main() {
  const t0 = Date.now();
  console.log("Building local text index...\n");

  getDb();

  // Get all data points with indicator names
  const points = query<DataPoint>(
    `SELECT dp.indicator_id, i.name AS indicator_name, dp.country_iso3, dp.year, dp.value, i.unit
     FROM data_points dp
     JOIN indicators i ON i.id = dp.indicator_id
     WHERE dp.value IS NOT NULL
     ORDER BY dp.indicator_id, dp.country_iso3, dp.year`,
  );

  console.log(`Total data points: ${points.length}`);

  // Build chunks — one per data point, limited to 50k for performance
  const MAX_CHUNKS = 50000;
  const chunks = points.slice(0, MAX_CHUNKS).map((p) => ({
    id: `vec_${p.indicator_id}_${p.country_iso3}_${p.year}`,
    text: buildChunkText(p),
    source: `data_point[${p.country_iso3}:${p.indicator_id}:${p.year}]`,
    indicator_id: p.indicator_id,
    country_iso3: p.country_iso3,
    year: p.year,
  }));

  console.log(`Target chunks: ${chunks.length}`);

  // Build TF-IDF index
  // Step 1: compute term frequency per document and document frequency
  const docFreq = new Map<string, number>();  // term -> # documents containing it
  const termFreqs: Map<string, number>[] = [];  // per-document term frequencies

  for (const chunk of chunks) {
    const tokens = tokenize(chunk.text);
    const seen = new Set<string>();
    const tf = new Map<string, number>();

    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
      if (!seen.has(t)) {
        seen.add(t);
        docFreq.set(t, (docFreq.get(t) || 0) + 1);
      }
    }

    termFreqs.push(tf);
  }

  const numDocs = chunks.length;
  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((numDocs + 1) / (df + 1)) + 1);
  }

  // Step 2: compute TF-IDF vectors and store
  const BATCH_SIZE = 100;
  let indexed = 0;

  // Clear existing index
  execute(`DELETE FROM embeddings`);

  const stmt = getDb().prepare(
    `INSERT INTO embeddings (id, chunk_text, source, indicator_id, country_iso3, year, embedding)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    for (let j = 0; j < batch.length; j++) {
      const ci = i + j;
      const tf = termFreqs[ci];
      const vec: number[] = [];

      // Compute TF-IDF scores for top terms (limit to 50 per doc for storage efficiency)
      const scored: [string, number][] = [];
      for (const [term, freq] of tf) {
        const weight = freq * (idf.get(term) || 1);
        scored.push([term, weight]);
      }
      scored.sort((a, b) => b[1] - a[1]);
      const topTerms = scored.slice(0, 50);

      // Serialize as JSON: {term: weight, ...}
      const vecObj: Record<string, number> = {};
      for (const [term, weight] of topTerms) {
        vecObj[term] = weight;
      }

      const jsonStr = JSON.stringify(vecObj);
      stmt.run(batch[j].id, batch[j].text, batch[j].source, batch[j].indicator_id, batch[j].country_iso3, batch[j].year, jsonStr);
      indexed++;
    }

    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= chunks.length) {
      console.log(`  ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} indexed`);
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const total = query<{ n: number }>(`SELECT COUNT(*) AS n FROM embeddings`);
  console.log(`\nDone in ${elapsed}s`);
  console.log(`  ${indexed} chunks indexed`);
  console.log(`  Embeddings table: ${total[0]?.n ?? 0} rows`);
  console.log(`  Vocabulary size: ${docFreq.size} unique terms`);
}

main().catch((err) => {
  console.error("Indexing failed:", err);
  process.exit(1);
});
