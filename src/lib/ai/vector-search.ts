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
  const scored = [...tf.entries()]
    .map(([term, freq]) => [term, freq * (idf.get(term) || 1)] as const)
    // Scoring every document against thousands of query terms is a CPU DoS, so
    // only the most informative terms take part in the comparison.
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_QUERY_TERMS);
  return new Map(scored);
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

/** Untrusted question length is clamped before tokenizing. */
const MAX_QUESTION_CHARS = 500;
/** Only this many highest-weight query terms are compared against each document. */
const MAX_QUERY_TERMS = 32;

type EmbeddingRow = {
  id: string;
  chunk_text: string;
  source: string;
  indicator_id: string | null;
  country_iso3: string | null;
  year: number | null;
  embedding: string | null;
};

type ParsedIndex = {
  /** Cheap change-detector so a re-ingest invalidates the memo. */
  fingerprint: string;
  docs: Array<{ row: EmbeddingRow; vec: Map<string, number> }>;
  idf: Map<string, number>;
};

/**
 * Parsing the index costs ~50k JSON.parse calls. That used to happen on *every*
 * chat request, which let an anonymous caller pin the event loop with one
 * request, so it is parsed once per process and re-used.
 */
let cachedIndex: ParsedIndex | null = null;

async function indexFingerprint(): Promise<string> {
  const rows = await query<{ n: number; mx: string | null }>(
    `SELECT COUNT(*) AS n, MAX(id) AS mx FROM embeddings
     WHERE embedding IS NOT NULL AND embedding != ''`,
  );
  return `${rows[0]?.n ?? 0}:${rows[0]?.mx ?? ""}`;
}

async function getIndex(): Promise<ParsedIndex | null> {
  const fingerprint = await indexFingerprint();
  if (cachedIndex?.fingerprint === fingerprint) return cachedIndex;

  const rows = await query<EmbeddingRow>(
    `SELECT id, chunk_text, source, indicator_id, country_iso3, year, embedding
     FROM embeddings WHERE embedding IS NOT NULL AND embedding != ''
     LIMIT 50000`,
  );

  const docs: ParsedIndex["docs"] = [];
  const docFreq = new Map<string, number>();

  for (const row of rows) {
    if (!row.embedding) continue;
    try {
      const vec = new Map(Object.entries(JSON.parse(row.embedding) as Record<string, number>));
      docs.push({ row, vec });
      for (const term of vec.keys()) {
        docFreq.set(term, (docFreq.get(term) || 0) + 1);
      }
    } catch {
      // skip malformed
    }
  }

  if (docs.length === 0) {
    cachedIndex = null;
    return null;
  }

  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((docs.length + 1) / (df + 1)) + 1);
  }

  cachedIndex = { fingerprint, docs, idf };
  return cachedIndex;
}

/**
 * Find the top-k most relevant chunks using local TF-IDF search.
 * Returns null when there is no usable index (caller falls back to keyword search).
 */
export async function vectorSearch(
  question: string,
  topK: number = 15,
): Promise<SearchResult[] | null> {
  const queryTokens = tokenize(question.slice(0, MAX_QUESTION_CHARS));
  if (queryTokens.length === 0) return null;

  const index = await getIndex();
  if (!index) return null;

  const queryVec = getQueryVector(queryTokens, index.idf);
  const scored: SearchResult[] = [];

  for (const { row, vec } of index.docs) {
    const similarity = cosineSimilarity(queryVec, vec);
    if (similarity <= 0) continue;
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

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
