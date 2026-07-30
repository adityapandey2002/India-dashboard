/**
 * Local TF-IDF vector search — no external API needed.
 * Builds term-frequency vectors from stored chunks and scores
 * queries by cosine similarity of TF-IDF weights.
 */

import { query } from "@/lib/db/client";

export type SearchResult = {
  id: string;
  text: string;
  source: string;
  score: number;
  indicator_id: string | null;
  country_iso3: string | null;
  year: number | null;
};

/** Map common country names to their ISO3 codes used in data chunks */
const COUNTRY_ALIASES: Record<string, string> = {
  india: "ind",
  america: "usa", "united states": "usa", "united states of america": "usa",
  china: "chn",
  brazil: "bra",
  japan: "jpn",
  germany: "deu",
  france: "fra",
  "united kingdom": "gbr", uk: "gbr",
  russia: "rus",
  canada: "can",
  australia: "aus",
  mexico: "mex",
  indonesia: "idn",
  turkey: "tur",
  "south korea": "kor", korea: "kor",
  italy: "ita",
  spain: "esp",
  sweden: "swe",
  norway: "nor",
  netherlands: "nld",
  singapore: "sgp",
  bangladesh: "bgd",
  pakistan: "pak",
  "sri lanka": "lka",
  nepal: "npl",
  bhutan: "btn",
  argentina: "arg",
  "south africa": "zaf",
};

function tokenize(text: string): string[] {
  let normalized = text.toLowerCase();
  for (const [name, iso3] of Object.entries(COUNTRY_ALIASES)) {
    normalized = normalized.replace(new RegExp(`\\b${name}\\b`, "g"), iso3);
  }
  return normalized
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !/^\d+$/.test(t));
}

function getQueryVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  const vec = new Map<string, number>();
  for (const [term, freq] of tf) {
    vec.set(term, freq * (idf.get(term) || 1));
  }
  return vec;
}

function cosineSimilarity(queryVec: Map<string, number>, docVec: Map<string, number>): number {
  let dot = 0;
  let normQ = 0;
  let normD = 0;

  for (const [term, qw] of queryVec) {
    const dw = docVec.get(term) || 0;
    dot += qw * dw;
    normQ += qw * qw;
  }
  for (const dw of docVec.values()) {
    normD += dw * dw;
  }

  const denom = Math.sqrt(normQ) * Math.sqrt(normD);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Find the top-k most relevant chunks using local TF-IDF search.
 * Falls back to keyword search if no index exists.
 */
export async function vectorSearch(
  question: string,
  topK: number = 15,
): Promise<SearchResult[] | null> {
  const queryTokens = tokenize(question);
  if (queryTokens.length === 0) return null;

  const rows = await query<{
    id: string;
    chunk_text: string;
    source: string;
    indicator_id: string | null;
    country_iso3: string | null;
    year: number | null;
    embedding: string | null;
  }>(
    `SELECT id, chunk_text, source, indicator_id, country_iso3, year, embedding
     FROM embeddings WHERE embedding IS NOT NULL AND embedding != ''
     LIMIT 50000`,
  );

  if (rows.length === 0) return null;

  const idf = new Map<string, number>();
  const docFreq = new Map<string, number>();
  const docVectors: Map<string, number>[] = [];
  let parsedCount = 0;

  for (const row of rows) {
    if (!row.embedding) continue;
    try {
      const vecObj = JSON.parse(row.embedding) as Record<string, number>;
      const dv = new Map(Object.entries(vecObj));
      docVectors.push(dv);
      for (const term of dv.keys()) {
        docFreq.set(term, (docFreq.get(term) || 0) + 1);
      }
      parsedCount++;
    } catch {
      // skip malformed
    }
  }

  if (parsedCount === 0) return null;

  const numDocs = parsedCount;
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((numDocs + 1) / (df + 1)) + 1);
  }

  const queryVec = getQueryVector(queryTokens, idf);

  const scored: SearchResult[] = [];

  for (let i = 0; i < parsedCount; i++) {
    const row = rows[i];
    const similarity = cosineSimilarity(queryVec, docVectors[i]);

    if (similarity > 0) {
      scored.push({
        id: row.id,
        text: row.chunk_text,
        source: row.source,
        score: similarity,
        indicator_id: row.indicator_id,
        country_iso3: row.country_iso3,
        year: row.year,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
