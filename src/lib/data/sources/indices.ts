/**
 * Composite-index fetchers for indicators that had no World Bank source:
 * INFORM Risk, WIPO Global Innovation Index, Global Peace Index,
 * Yale EPI, Network Readiness Index, AI Readiness, Social Progress Index.
 *
 * Each returns rows with either `iso3` (already known) or `name` (must be
 * resolved via the countries table — see `resolveIso3`).
 */
import * as XLSX from "xlsx";

export type IndicesDataPoint = {
  iso3?: string;
  name?: string;
  indicatorId: string;
  year: number;
  value: number;
};

const KNOWN_ISO = new Set([
  "ABW","AFG","AGO","ALB","AND","ARE","ARG","ARM","ATG","AUS","AUT","AZE",
  "BDI","BEL","BEN","BFA","BGD","BGR","BHR","BHS","BIH","BLR","BLZ","BOL",
  "BRA","BRB","BRN","BTN","BWA","CAF","CAN","CHE","CHL","CHN","CIV","CMR",
  "COD","COG","COL","COM","CPV","CRI","CUB","CYP","CZE","DEU","DJI","DMA",
  "DNK","DOM","DZA","ECU","EGY","ERI","ESP","EST","ETH","FIN","FJI","FRA",
  "FSM","GAB","GBR","GEO","GHA","GIN","GMB","GNB","GNQ","GRC","GRD","GTM",
  "GUM","GUY","HKG","HND","HRV","HTI","HUN","IDN","IND","IRL","IRN","IRQ",
  "ISL","ISR","ITA","JAM","JOR","JPN","KAZ","KEN","KGZ","KHM","KIR","KNA",
  "KOR","KWT","LAO","LBN","LBR","LBY","LCA","LIE","LKA","LSO","LTU","LUX",
  "LVA","MAC","MAR","MDA","MDG","MDV","MEX","MHL","MKD","MLI","MLT","MMR",
  "MNE","MNG","MOZ","MRT","MUS","MWI","MYS","MYT","NAM","NCL","NER","NGA",
  "NIC","NLD","NOR","NPL","NZL","OMN","PAK","PAN","PER","PHL","PLW","PNG",
  "POL","PRI","PRK","PRT","PRY","PSE","PYF","QAT","ROU","RUS","RWA","SAU",
  "SDN","SEN","SGP","SLB","SLE","SLV","SMR","SOM","SRB","SSD","STP","SUR",
  "SVK","SVN","SWE","SWZ","SYC","SYR","TCD","TGO","THA","TJK","TKM","TLS",
  "TON","TTO","TUN","TUR","TUV","TWN","TZA","UGA","UKR","URY","USA","UZB",
  "VCT","VEN","VNM","VUT","WSM","YEM","ZAF","COD","ZMB","ZWE",
]);

/** Name discrepancies across sources → ISO3. Keys are raw; normalized at load. */
const NAME_OVERRIDES: Record<string, string> = {
  "korea. republic of": "KOR",
  "republic of korea": "KOR",
  "congo. republic of": "COG",
  "congo. democratic republic of": "COD",
  "democratic republic of the congo": "COD",
  "republic of the congo": "COG",
  "congo": "COG",
  "gambia. the": "GMB",
  "the gambia": "GMB",
  "cote d'ivoire": "CIV",
  "west bank and gaza": "PSE",
  "palestine": "PSE",
  "taiwan": "TWN",
  "turkiye": "TUR",
  "turkey": "TUR",
  "russia": "RUS",
  "russian federation": "RUS",
  "laos": "LAO",
  "lao pdr": "LAO",
  "iran": "IRN",
  "syria": "SYR",
  "viet nam": "VNM",
  "vietnam": "VNM",
  "united states": "USA",
  "united states of america": "USA",
  "united kingdom": "GBR",
  "brunei darussalam": "BRN",
  "cabo verde": "CPV",
  "timor-leste": "TLS",
  "eswatini": "SWZ",
  "czechia": "CZE",
  "slovakia": "SVK",
  "sao tome and principe": "STP",
  "trinidad and tobago": "TTO",
  "bosnia and herzegovina": "BIH",
  "north macedonia": "MKD",
  "republic of north macedonia": "MKD",
  "moldova": "MDA",
  "kyrgyzstan": "KGZ",
  "kyrgyz republic": "KGZ",
  "antigua and barbuda": "ATG",
  "saint kitts and nevis": "KNA",
  "saint lucia": "LCA",
  "saint vincent and the grenadines": "VCT",
  "micronesia": "FSM",
  "marshall islands": "MHL",
  "bahamas": "BHS",
  "bahamas, the": "BHS",
  "egypt": "EGY",
  "egypt, arab rep.": "EGY",
  "gambia": "GMB",
  "somalia": "SOM",
  "somalia, fed. rep.": "SOM",
  "venezuela": "VEN",
  "venezuela, rb": "VEN",
  "yemen": "YEM",
  "yemen, rep.": "YEM",
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[.,'"&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NAME_OVERRIDES_NORM = new Map<string, string>(
  Object.entries(NAME_OVERRIDES).map(([k, v]) => [normalizeName(k), v]),
);

/**
 * Resolve a country name to ISO3. `known` is a Map of normalized name → ISO3
 * built from the countries table (see ingest). Returns null if unresolvable.
 */
export function resolveIso3(name: string, known: Map<string, string>): string | null {
  const norm = normalizeName(name);
  if (NAME_OVERRIDES_NORM.has(norm)) return NAME_OVERRIDES_NORM.get(norm)!;
  if (known.has(norm)) return known.get(norm)!;
  // Strip leading "Republic of " / "Democratic Republic of " before matching
  const stripped = norm
    .replace(/^(democratic )?republic of /, "")
    .replace(/^(federal )?republic of /, "");
  if (stripped !== norm && known.has(stripped)) return known.get(stripped)!;
  if (stripped !== norm && NAME_OVERRIDES_NORM.has(stripped)) return NAME_OVERRIDES_NORM.get(stripped)!;
  return null;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else current += ch;
  }
  result.push(current);
  return result;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchXlsx(url: string): Promise<XLSX.WorkBook | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return XLSX.read(buf, { type: "array" });
  } catch {
    return null;
  }
}

/* ── INFORM Risk Index (disaster_risk) ─────────────────────────── */
const INFORM_URL =
  "https://data.humdata.org/dataset/f5ec2ee7-8a1b-49b4-864b-70bdb582a022/resource/b1d4a203-ef6e-44f7-9895-17c127aeaaee/download/inform_risk_index_trends.csv";

export async function fetchInformRisk(): Promise<IndicesDataPoint[]> {
  const text = await fetchText(INFORM_URL);
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/"/g, "").trim());
  const isoIdx = headers.indexOf("Iso3");
  const yearIdx = headers.indexOf("GNAYear");
  const indIdx = headers.indexOf("IndicatorId");
  const valIdx = headers.indexOf("IndicatorScore");
  if (isoIdx < 0 || yearIdx < 0 || indIdx < 0 || valIdx < 0) return [];

  const points: IndicesDataPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols[indIdx] !== "INFORM") continue; // overall risk index only
    const iso3 = cols[isoIdx]?.trim().toUpperCase();
    if (!iso3 || !KNOWN_ISO.has(iso3)) continue;
    const year = parseInt(cols[yearIdx], 10);
    const val = parseFloat(cols[valIdx]);
    if (isNaN(year) || isNaN(val)) continue;
    points.push({ iso3, indicatorId: "disaster_risk", year, value: val });
  }
  return points;
}

/* ── WIPO Global Innovation Index (innovation_idx) ─────────────── */
const GII_YEARS = [2024, 2023, 2022];

export async function fetchGiiIndex(): Promise<IndicesDataPoint[]> {
  const all: IndicesDataPoint[] = [];
  for (const year of GII_YEARS) {
    const url = `https://www.wipo.int/edocs/pubdocs/en/wipo-pub-2000-${year}-tech1.xlsx`;
    const wb = await fetchXlsx(url);
    if (!wb) continue;
    const sheetName = wb.SheetNames.find((s) => s === "Data") ?? wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[sheetName], { header: 1 });
    const header = rows[0] as any[];
    const isoIdx = header.indexOf("ISO3");
    const nameIdx = header.indexOf("NAME");
    const scoreIdx = header.indexOf("SCORE");
    if (isoIdx < 0 || nameIdx < 0 || scoreIdx < 0) continue;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as any[];
      if (String(row[nameIdx] ?? "").trim() !== "Global Innovation Index") continue;
      const iso3 = String(row[isoIdx] ?? "").trim().toUpperCase();
      if (!iso3 || !KNOWN_ISO.has(iso3)) continue;
      const val = parseFloat(String(row[scoreIdx]));
      if (isNaN(val)) continue;
      all.push({ iso3, indicatorId: "innovation_idx", year, value: val });
    }
  }
  return all;
}

/* ── Global Peace Index (global_peace) ─────────────────────────── */
const GPI_URL =
  "https://raw.githubusercontent.com/sfield2/Peace-EcologcialSustainability-Paradox/main/DATA/GPI_2008_2024.csv";

export async function fetchGpi(): Promise<IndicesDataPoint[]> {
  const text = await fetchText(GPI_URL);
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/"/g, "").trim());
  const isoIdx = headers.indexOf("geocode");
  const yearIdx = headers.indexOf("year");
  const valIdx = headers.indexOf("Overall Score");
  if (isoIdx < 0 || yearIdx < 0 || valIdx < 0) return [];

  const points: IndicesDataPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const iso3 = cols[isoIdx]?.trim().toUpperCase();
    if (!iso3 || !KNOWN_ISO.has(iso3)) continue;
    const year = parseInt(cols[yearIdx], 10);
    const val = parseFloat(cols[valIdx]);
    if (isNaN(year) || isNaN(val)) continue;
    points.push({ iso3, indicatorId: "global_peace", year, value: val });
  }
  return points;
}

/* ── Yale Environmental Performance Index (epi) ────────────────── */
const EPI_URL = "https://epi.yale.edu/downloads/epi2026results2026-07-07.xlsx";

export async function fetchEpi(): Promise<IndicesDataPoint[]> {
  const wb = await fetchXlsx(EPI_URL);
  if (!wb) return [];
  const sheetName = wb.SheetNames.find((s) => s === "data") ?? wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[sheetName], { header: 1 });
  const header = rows[0] as any[];
  const isoIdx = header.indexOf("iso");
  const scoreIdx = header.indexOf("EPI.new");
  if (isoIdx < 0 || scoreIdx < 0) return [];

  const points: IndicesDataPoint[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as any[];
    const iso3 = String(row[isoIdx] ?? "").trim().toUpperCase();
    if (!iso3 || !KNOWN_ISO.has(iso3)) continue;
    const raw = row[scoreIdx];
    if (raw === undefined || raw === null || String(raw).trim() === "NA") continue;
    const val = parseFloat(String(raw));
    if (isNaN(val)) continue;
    points.push({ iso3, indicatorId: "epi", year: 2024, value: val });
  }
  return points;
}

/* ── Network Readiness Index (network_readiness) ───────────────── */
const NRI_URL = "https://download.networkreadinessindex.org/reports/data/2024/nri-2024-dataset.xlsx";

export async function fetchNri(): Promise<IndicesDataPoint[]> {
  const wb = await fetchXlsx(NRI_URL);
  if (!wb) return [];
  const sheetName = wb.SheetNames.find((s) => s.includes("NRI")) ?? wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[sheetName], { header: 1 });

  const points: IndicesDataPoint[] = [];
  for (const row of rows) {
    const iso3 = String(row[1] ?? "").trim().toUpperCase();
    if (!iso3 || !KNOWN_ISO.has(iso3)) continue;
    const raw = row[6];
    if (raw === undefined || raw === null || raw === "") continue;
    const val = parseFloat(String(raw));
    if (isNaN(val)) continue;
    points.push({ iso3, indicatorId: "network_readiness", year: 2024, value: val });
  }
  return points;
}

/* ── Government AI Readiness Index (ai_readiness) — name-based ─── */
const AIRI_URL =
  "https://raw.githubusercontent.com/ALBADI140/goverment_ai_amplification/main/data/ai_readiness_2024.csv";

export async function fetchAiReadiness(): Promise<IndicesDataPoint[]> {
  const text = await fetchText(AIRI_URL);
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/"/g, "").trim());
  const nameIdx = headers.indexOf("country");
  const valIdx = headers.indexOf("total_score");
  if (nameIdx < 0 || valIdx < 0) return [];

  const points: IndicesDataPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = cols[nameIdx]?.trim();
    const val = parseFloat(cols[valIdx]);
    if (!name || isNaN(val)) continue;
    points.push({ name, indicatorId: "ai_readiness", year: 2024, value: val });
  }
  return points;
}

/* ── Social Progress Index (social_progress_idx) — name-based ──── */
const SPI_URL =
  "https://raw.githubusercontent.com/rahul-bakshi/Global-Social-Progress-Index/main/spi.csv";

export async function fetchSpi(): Promise<IndicesDataPoint[]> {
  const text = await fetchText(SPI_URL);
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/"/g, "").trim());
  const nameIdx = headers.indexOf("country");
  const valIdx = headers.indexOf("spi_score");
  if (nameIdx < 0 || valIdx < 0) return [];

  const points: IndicesDataPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = cols[nameIdx]?.trim();
    const val = parseFloat(cols[valIdx]);
    if (!name || isNaN(val) || name === "World") continue;
    points.push({ name, indicatorId: "social_progress_idx", year: 2017, value: val });
  }
  return points;
}
