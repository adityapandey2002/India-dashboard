import * as XLSX from "xlsx";

export type SdgDataPoint = {
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

const SDR_CONFIGS = [
  { url: "https://raw.githubusercontent.com/sdsna/SDR2020/master/SDR2020Database.xlsx", year: 2020, sheetHints: ["SDR2020 Data", "SDR2020", "Data", "Overview"] },
  { url: "https://raw.githubusercontent.com/sdsna/SDR2021/master/SDR%202021%20-%20Database.xlsx", year: 2021, sheetHints: ["SDR 2021 Data", "SDR2021 Data", "SDR 2021", "Data", "Overview"] },
  { url: "https://raw.githubusercontent.com/sdsna/SDR2022/master/SDR-2022-database.xlsx", year: 2022, sheetHints: ["SDR2022 Data", "SDR 2022 Data", "SDR2022", "Data", "Overview"] },
];

function findSheet(workbook: XLSX.WorkBook, hints: string[]): string | undefined {
  for (const hint of hints) {
    const match = workbook.SheetNames.find((s) => s.includes(hint) || hint.includes(s));
    if (match) return match;
  }
  return workbook.SheetNames[0];
}

export async function fetchSdgIndex(): Promise<SdgDataPoint[]> {
  const all: SdgDataPoint[] = [];

  for (const cfg of SDR_CONFIGS) {
    try {
      const res = await fetch(cfg.url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        console.warn(`  ⚠ SDG ${cfg.year}: HTTP ${res.status} ${res.statusText}`);
        continue;
      }

      const buf = await res.arrayBuffer();
      const workbook = XLSX.read(buf, { type: "array" });
      const sheetName = findSheet(workbook, cfg.sheetHints);
      if (!sheetName) {
        console.warn(`  ⚠ SDG ${cfg.year}: no matching sheet found in ${workbook.SheetNames.join(", ")}`);
        continue;
      }

      const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[sheetName], { header: 1 });
      if (rows.length < 2) continue;

      const codeIdx = 0;
      const scoreIdx = 2;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as any[];
        const code = String(row[codeIdx] ?? "").trim().toUpperCase();
        if (!code || !KNOWN_ISO.has(code)) continue;

        const rawVal = row[scoreIdx];
        if (rawVal === undefined || rawVal === null || rawVal === "") continue;
        const val = parseFloat(String(rawVal));
        if (isNaN(val)) continue;

        all.push({ iso3: code, indicatorId: "sdg_score", year: cfg.year, value: val });
      }
    } catch (err) {
      console.warn(`  ⚠ SDG ${cfg.year} fetch error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return all;
}
