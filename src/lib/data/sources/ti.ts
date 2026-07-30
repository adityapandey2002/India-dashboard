/**
 * Fetcher for Transparency International Corruption Perceptions Index.
 * Downloads CSV from the datahub.io core dataset.
 */

const CPI_CSV_URL = "https://datahub.io/core/cpi/r/cpi.csv";

export type TiDataPoint = {
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

export async function fetchTiCpi(): Promise<TiDataPoint[]> {
  const res = await fetch(CPI_CSV_URL, {
    headers: { "User-Agent": "IndiaDashboard/0.1" },
  });
  if (!res.ok) return [];

  const csvText = await res.text();
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/"/g, "").trim());
  const countryCodeIdx = headers.indexOf("Country Code");
  const yearIdx = headers.indexOf("Year");
  const cpiIdx = headers.indexOf("CPI");

  if (countryCodeIdx < 0 || yearIdx < 0 || cpiIdx < 0) return [];

  const points: TiDataPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const iso3 = cols[countryCodeIdx]?.replace(/"/g, "").trim().toUpperCase();
    if (!iso3 || !KNOWN_ISO.has(iso3)) continue;

    const yearStr = cols[yearIdx]?.replace(/"/g, "").trim();
    const valStr = cols[cpiIdx]?.replace(/"/g, "").trim();
    if (!yearStr || !valStr) continue;

    const year = parseInt(yearStr, 10);
    const val = parseFloat(valStr);
    if (isNaN(year) || isNaN(val) || year < 2010) continue;

    points.push({ iso3, indicatorId: "corruption_idx", year, value: val });
  }

  return points;
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
