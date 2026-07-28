import AdmZip from "adm-zip";

const WGI_CSV_URL = "https://databank.worldbank.org/data/download/WGI_CSV.zip";

export type WgiDataPoint = {
  iso3: string;
  indicatorId: string;
  year: number;
  value: number;
};

const CODE_MAP: Record<string, string> = {
  "GE.EST": "gov_effectiveness",
  "PV.EST": "political_stability",
  "RQ.EST": "regulatory_quality",
  "VA.EST": "voice_accountability",
  "RL.EST": "rule_of_law",
  "CC.EST": "control_corruption",
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

export async function fetchWgiData(): Promise<WgiDataPoint[]> {
  const res = await fetch(WGI_CSV_URL, {
    headers: { "User-Agent": "IndiaDashboard/0.1" },
  });
  if (!res.ok) return [];

  const buffer = await res.arrayBuffer();
  let csvText = "";

  try {
    const zip = new AdmZip(Buffer.from(buffer));
    const entries = zip.getEntries();
    const csvEntry = entries.find((e) => e.entryName.endsWith(".csv"));
    if (!csvEntry) return [];
    csvText = csvEntry.getData().toString("utf-8");
  } catch {
    return [];
  }

  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/"/g, "").trim());
  const codeIdx = headers.indexOf("Indicator Code");
  const isoIdx = headers.indexOf("Country Code");
  if (codeIdx < 0 || isoIdx < 0) return [];

  const yearCols: { col: number; year: number }[] = [];
  for (let c = 0; c < headers.length; c++) {
    const yr = parseInt(headers[c], 10);
    if (!isNaN(yr) && yr >= 2010) yearCols.push({ col: c, year: yr });
  }

  const points: WgiDataPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const code = cols[codeIdx]?.replace(/"/g, "").trim().replace(/^GOV_WGI_/, "") ?? "";
    const internalId = CODE_MAP[code];
    if (!internalId) continue;

    const iso3 = cols[isoIdx]?.replace(/"/g, "").trim();
    if (!iso3 || !KNOWN_ISO.has(iso3)) continue;

    for (const { col, year } of yearCols) {
      const raw = cols[col]?.replace(/"/g, "").trim();
      if (!raw || raw === "" || raw === "..") continue;
      const val = parseFloat(raw);
      if (isNaN(val)) continue;
      points.push({ iso3, indicatorId: internalId, year, value: val });
    }
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
