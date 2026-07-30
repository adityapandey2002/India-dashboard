/**
 * Generic fetcher for Our World in Data curated datasets.
 * Fetches CSV datasets from the owid/owid-datasets GitHub repository.
 */

import { query } from "@/lib/db/client";

const OWID_RAW = "https://raw.githubusercontent.com/owid/owid-datasets/master";

export type OwidDataPoint = {
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

type DatasetConfig = {
  path: string;             // path within owid-datasets repo (e.g. "datasets/World Happiness Report (2022)")
  filename: string;         // CSV filename
  valueColumn: string;      // exact column name in CSV
  indicatorId: string;      // our indicator ID to map to
  minYear?: number;         // optional: filter years before this
};

const DATASETS: DatasetConfig[] = [
  {
    path: "datasets/World Happiness Report (2022)",
    filename: "World Happiness Report (2022).csv",
    valueColumn: "Life satisfaction in Cantril Ladder (World Happiness Report 2022)",
    indicatorId: "happiness_score",
  },
  {
    path: "datasets/Healthcare Access and Quality Index – IHME (2017)",
    filename: "Healthcare Access and Quality Index – IHME (2017).csv",
    valueColumn: "HAQ Index (IHME (2017))",
    indicatorId: "haq_idx",
  },
  {
    path: "datasets/Economic Freedom of the World - Fraser Institute (2018)",
    filename: "Economic Freedom of the World - Fraser Institute (2018).csv",
    valueColumn: "Economic Freedom of the World",
    indicatorId: "economic_freedom",
    minYear: 2010,
  },
  {
    path: "datasets/Press freedom - Freedom House (2017)",
    filename: "Press freedom - Freedom House (2017).csv",
    valueColumn: "Freedom of the Press",
    indicatorId: "press_freedom",
    minYear: 2010,
  },
  {
    path: "datasets/OECD Education! PISA Test Scores - PISA (2015)",
    filename: "OECD Education! PISA Test Scores - PISA (2015).csv",
    valueColumn: "OECD PISA education score (PISA (2015))",
    indicatorId: "pisa_score",
    minYear: 2010,
  },
  {
    path: "datasets/RAND Database of Worldwide Terrorism Incidents",
    filename: "RAND Database of Worldwide Terrorism Incidents.csv",
    valueColumn: "Count of terrorist incidents (RAND)",
    indicatorId: "terrorism_idx",
  },
  {
    path: "datasets/Government Transparency index - Hollyer et al. (2014)",
    filename: "Government Transparency index - Hollyer et al. (2014).csv",
    valueColumn: "gov_transparency",
    indicatorId: "open_budget",
    minYear: 2010,
  },
  {
    path: "datasets/Gender Wage Gap – OECD (2017)",
    filename: "Gender Wage Gap – OECD (2017).csv",
    valueColumn: "Gender wage gap (OECD 2017)",
    indicatorId: "gender_gap",
    minYear: 2010,
  },
];

/** Entity name → ISO3 mapping — builds from DB country table with hardcoded fallback */
const HARDCODED_MAP: Record<string, string> = {
  "india": "IND", "china": "CHN", "united states": "USA", "usa": "USA",
  "brazil": "BRA", "japan": "JPN", "germany": "DEU", "france": "FRA",
  "united kingdom": "GBR", "uk": "GBR", "russia": "RUS", "canada": "CAN",
  "australia": "AUS", "mexico": "MEX", "indonesia": "IDN", "turkey": "TUR",
  "south korea": "KOR", "italy": "ITA", "spain": "ESP", "argentina": "ARG",
  "sweden": "SWE", "norway": "NOR", "netherlands": "NLD", "singapore": "SGP",
  "bangladesh": "BGD", "pakistan": "PAK", "sri lanka": "LKA", "nepal": "NPL",
  "bhutan": "BTN", "south africa": "ZAF", "saudi arabia": "SAU",
  "switzerland": "CHE", "poland": "POL", "belgium": "BEL", "austria": "AUT",
  "israel": "ISR", "egypt": "EGY", "nigeria": "NGA", "kenya": "KEN",
  "ethiopia": "ETH", "vietnam": "VNM", "thailand": "THA", "malaysia": "MYS",
  "philippines": "PHL", "new zealand": "NZL", "chile": "CHL", "colombia": "COL",
  "peru": "PER", "ukraine": "UKR", "romania": "ROU", "czech republic": "CZE",
  "portugal": "PRT", "greece": "GRC", "hungary": "HUN", "denmark": "DNK",
  "finland": "FIN", "ireland": "IRL", "morocco": "MAR", "algeria": "DZA",
  "tunisia": "TUN", "ghana": "GHA", "tanzania": "TZA", "uganda": "UGA",
  "congo": "COD", "cameroon": "CMR", "ivory coast": "CIV", "sudan": "SDN",
  "yemen": "YEM", "jordan": "JOR", "lebanon": "LBN", "qatar": "QAT",
  "kuwait": "KWT", "oman": "OMN", "bahrain": "BHR", "united arab emirates": "ARE",
  "bolivia": "BOL", "uruguay": "URY", "paraguay": "PRY", "venezuela": "VEN",
  "costa rica": "CRI", "panama": "PAN", "guatemala": "GTM", "cuba": "CUB",
  "dominican republic": "DOM", "haiti": "HTI", "honduras": "HND",
  "el salvador": "SLV", "nicaragua": "NIC", "myanmar": "MMR",
  "cambodia": "KHM", "laos": "LAO", "mongolia": "MNG", "kazakhstan": "KAZ",
  "uzbekistan": "UZB", "azerbaijan": "AZE", "georgia": "GEO",
  "croatia": "HRV", "serbia": "SRB", "bulgaria": "BGR", "slovakia": "SVK",
  "slovenia": "SVN", "lithuania": "LTU", "latvia": "LVA", "estonia": "EST",
  "cyprus": "CYP", "luxembourg": "LUX", "malta": "MLT", "iceland": "ISL",
  "afghanistan": "AFG", "iran": "IRN", "iraq": "IRQ", "syria": "SYR",
  "libya": "LBY", "somalia": "SOM", "angola": "AGO", "mozambique": "MOZ",
  "zambia": "ZMB", "zimbabwe": "ZWE", "malawi": "MWI", "madagascar": "MDG",
  "rwanda": "RWA", "burundi": "BDI", "south sudan": "SSD", "chad": "TCD",
  "niger": "NER", "mali": "MLI", "burkina faso": "BFA", "senegal": "SEN",
  "benin": "BEN", "togo": "TGO", "sierra leone": "SLE", "liberia": "LBR",
  "mauritania": "MRT", "gambia": "GMB", "guinea": "GIN", "guinea-bissau": "GNB",
  "equatorial guinea": "GNQ", "gabon": "GAB", "botswana": "BWA",
  "namibia": "NAM", "lesotho": "LSO", "swaziland": "SWZ",
  "fiji": "FJI", "papua new guinea": "PNG", "trinidad and tobago": "TTO",
  "jamaica": "JAM", "bahamas": "BHS", "barbados": "BRB", "mauritius": "MUS",
  "north macedonia": "MKD", "moldova": "MDA", "armenia": "ARM", "albania": "ALB",
  "belarus": "BLR", "bosnia and herzegovina": "BIH", "montenegro": "MNE",
  "hong kong": "HKG", "taiwan": "TWN", "macau": "MAC",
  "puerto rico": "PRI", "palestine": "PSE",
  "belize": "BLZ", "brunei": "BRN", "dubai": "ARE", "djibouti": "DJI",
  "east timor": "TLS", "eritrea": "ERI", "french guiana": "GUF",
  "guyana": "GUY", "kosovo": "XKX", "kyrgyzstan": "KGZ", "maldives": "MDV",
  "monaco": "MCO", "suriname": "SUR",
  "tajikistan": "TJK", "turkmenistan": "TKM", "samoa": "WSM",
  "solomon islands": "SLB", "vanuatu": "VUT", "tonga": "TON",
  "kiribati": "KIR", "micronesia": "FSM", "marshall islands": "MHL",
  "palau": "PLW", "nauru": "NRU", "tuvalu": "TUV", "sao tome and principe": "STP",
  "cape verde": "CPV", "comoros": "COM", "seychelles": "SYC",
  "liechtenstein": "LIE", "andorra": "AND",
  "san marino": "SMR", "vatican": "VAT",
};

let entityCache: Record<string, string> | null = null;

async function entityToIso3(entity: string, _year: number): Promise<string | null> {
  if (!entityCache) {
    entityCache = {};
    // Try DB first
    try {
      const rows = await query<{ iso3: string; name: string }>(
        `SELECT iso3, name FROM countries WHERE name IS NOT NULL`,
      );
      for (const r of rows) {
        entityCache[r.name.trim().toLowerCase()] = r.iso3;
      }
    } catch { /* fall through */ }
    // Merge hardcoded map as fallback
    for (const [name, iso3] of Object.entries(HARDCODED_MAP)) {
      entityCache[name] = iso3;
    }
  }
  return entityCache[entity.trim().toLowerCase()] ?? null;
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

async function fetchDataset(cfg: DatasetConfig): Promise<OwidDataPoint[]> {
  const url = `${OWID_RAW}/${encodeURI(cfg.path)}/${encodeURI(cfg.filename)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "IndiaDashboard/0.1" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];

  const text = await res.text();
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/"/g, "").trim());
  const entityIdx = headers.indexOf("Entity");
  const yearIdx = headers.indexOf("Year");
  const valIdx = headers.indexOf(cfg.valueColumn);

  if (entityIdx < 0 || yearIdx < 0 || valIdx < 0) return [];

  const points: OwidDataPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const entity = cols[entityIdx]?.replace(/"/g, "").trim();
    if (!entity) continue;

    const iso3 = await entityToIso3(entity, 0);
    if (!iso3 || !KNOWN_ISO.has(iso3)) continue;

    const yearStr = cols[yearIdx]?.replace(/"/g, "").trim();
    const valStr = cols[valIdx]?.replace(/"/g, "").trim();
    if (!yearStr || !valStr) continue;

    const year = parseInt(yearStr, 10);
    const val = parseFloat(valStr);
    if (isNaN(year) || isNaN(val)) continue;
    if (cfg.minYear && year < cfg.minYear) continue;

    points.push({ iso3, indicatorId: cfg.indicatorId, year, value: val });
  }

  return points;
}

export async function fetchOwidIndicators(): Promise<OwidDataPoint[]> {
  const results = await Promise.allSettled(
    DATASETS.map((cfg) => fetchDataset(cfg)),
  );

  const all: OwidDataPoint[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      all.push(...r.value);
    }
  }
  return all;
}
