export type UnDataPoint = {
  iso3: string;
  indicatorId: string;
  year: number;
  value: number;
};

const KNOWN_ISO = new Set([
  "ARE","ARG","AUS","AUT","BEL","BGD","BGR","BHR","BHS","BIH","BLR","BOL",
  "BRA","BRN","BTN","BWA","CAN","CHE","CHL","CHN","CIV","CMR","COD","COG",
  "COL","COM","CPV","CRI","CUB","CYP","CZE","DEU","DNK","DOM","DZA","ECU",
  "EGY","ESP","EST","ETH","FIN","FRA","GAB","GBR","GEO","GHA","GIN","GMB",
  "GNB","GNQ","GRC","GTM","GUY","HKG","HND","HRV","HTI","HUN","IDN","IND",
  "IRL","IRN","IRQ","ISL","ISR","ITA","JAM","JOR","JPN","KAZ","KEN","KGZ",
  "KHM","KIR","KOR","KWT","LAO","LBN","LBR","LBY","LKA","LSO","LTU","LUX",
  "LVA","MAC","MAR","MDA","MDG","MDV","MEX","MKD","MLI","MLT","MMR","MNE",
  "MNG","MOZ","MRT","MUS","MWI","MYS","NAM","NER","NGA","NIC","NLD","NOR",
  "NPL","NZL","OMN","PAK","PAN","PER","PHL","PLW","PNG","POL","PRI","PRT",
  "PRY","QAT","ROU","RUS","RWA","SAU","SDN","SEN","SGP","SLB","SLE","SLV",
  "SMR","SRB","SSD","STP","SUR","SVK","SVN","SWE","SWZ","SYC","SYR","TCD",
  "TGO","THA","TJK","TKM","TLS","TON","TTO","TUN","TUR","TUV","TWN","TZA",
  "UGA","UKR","URY","USA","UZB","VCT","VEN","VNM","VUT","WSM","YEM","ZAF",
  "ZMB","ZWE",
]);

const EGDI_URL = "https://data360files.worldbank.org/data360-data/data/UN_EGDI/UN_EGDI_EGDI_WIDEF.csv";

export async function fetchUnEGov(): Promise<UnDataPoint[]> {
  try {
    const res = await fetch(EGDI_URL, {
      headers: { "User-Agent": "IndiaDashboard/0.1" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];

    const text = await res.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]);
    const yearCols: { index: number; year: number }[] = [];
    for (let i = 0; i < headers.length; i++) {
      const y = parseInt(headers[i], 10);
      if (!isNaN(y) && y >= 2000) {
        yearCols.push({ index: i, year: y });
      }
    }

    // Find the REF_AREA (iso3) column
    const refAreaIdx = headers.indexOf("REF_AREA");
    if (refAreaIdx < 0) return [];

    const points: UnDataPoint[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const iso3 = cols[refAreaIdx]?.toUpperCase();
      if (!iso3 || !KNOWN_ISO.has(iso3)) continue;

      for (const { index: ci, year } of yearCols) {
        const raw = cols[ci]?.trim();
        if (!raw || raw === "") continue;
        const val = parseFloat(raw);
        if (isNaN(val)) continue;
        points.push({ iso3, indicatorId: "egov_idx", year, value: val });
      }
    }
    return points;
  } catch {
    return [];
  }
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
