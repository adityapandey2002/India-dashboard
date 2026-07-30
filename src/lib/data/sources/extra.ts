export type ExtraDataPoint = {
  iso3: string;
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

type GrapherConfig = {
  slug: string;
  valueColumn: string;
  indicatorId: string;
  multiplier?: number;
  minYear?: number;
};

const GRAPHER_DATASETS: GrapherConfig[] = [
  {
    slug: "electoral-democracy-index",
    valueColumn: "Electoral democracy index",
    indicatorId: "democracy_idx",
    multiplier: 10,
    minYear: 2000,
  },
  {
    slug: "liberal-democracy-index",
    valueColumn: "Liberal democracy index",
    indicatorId: "democracy_idx",
    multiplier: 10,
    minYear: 2000,
  },
  {
    slug: "rule-of-law-index",
    valueColumn: "Rule of Law index",
    indicatorId: "rule_of_law",
    minYear: 2000,
  },
  {
    slug: "refugee-population-by-country-or-territory-of-asylum",
    valueColumn: "Refugees by country of asylum",
    indicatorId: "refugee_population",
    minYear: 2000,
  },
  {
    slug: "multidimensional-poverty-index-mpi",
    valueColumn: "Multidimensional Poverty Index (MPI)",
    indicatorId: "multidim_poverty",
    minYear: 2000,
  },
];

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

async function fetchGrapherDataset(cfg: GrapherConfig): Promise<ExtraDataPoint[]> {
  const url = `https://ourworldindata.org/grapher/${cfg.slug}.csv?v=1&csvType=full&useColumnShortNames=false`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];

    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map((h) => h.replace(/"/g, "").trim());
    const codeIdx = headers.indexOf("Code");
    const yearIdx = headers.indexOf("Year");
    const valIdx = headers.indexOf(cfg.valueColumn);
    if (codeIdx < 0 || yearIdx < 0 || valIdx < 0) {
      // fallback: try Entity-based lookup
      return [];
    }

    const points: ExtraDataPoint[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const code = cols[codeIdx]?.replace(/"/g, "").trim().toUpperCase();
      if (!code || !KNOWN_ISO.has(code)) continue;

      const yearStr = cols[yearIdx]?.replace(/"/g, "").trim();
      const valStr = cols[valIdx]?.replace(/"/g, "").trim();
      if (!yearStr || !valStr) continue;

      const year = parseInt(yearStr, 10);
      const val = parseFloat(valStr);
      if (isNaN(year) || isNaN(val)) continue;
      if (cfg.minYear && year < cfg.minYear) continue;

      points.push({
        iso3: code,
        indicatorId: cfg.indicatorId,
        year,
        value: cfg.multiplier ? val * cfg.multiplier : val,
      });
    }
    return points;
  } catch {
    return [];
  }
}

export async function fetchExtraIndicators(): Promise<ExtraDataPoint[]> {
  const results = await Promise.allSettled(
    GRAPHER_DATASETS.map((cfg) => fetchGrapherDataset(cfg)),
  );

  const all: ExtraDataPoint[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  // Deduplicate: when multiple configs map to same indicatorId (democracy_idx
  // from both electoral and liberal indexes), keep the one with more data
  const seen = new Map<string, Map<string, Set<number>>>();
  const deduped: ExtraDataPoint[] = [];
  for (const pt of all) {
    const key = `${pt.iso3}:${pt.indicatorId}`;
    if (!seen.has(key)) seen.set(key, new Map());
    const years = seen.get(key)!;
    if (!years.has(`${pt.year}`)) {
      years.set(`${pt.year}`, new Set());
      deduped.push(pt);
    }
  }

  return deduped;
}
