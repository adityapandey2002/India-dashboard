/**
 * Fetchers for the previously "zero-point" indicators that DO have open sources:
 *
 *  - global_competitiveness (WEF GCI 4.0 via WB Data360 long CSV)
 *  - govtech_maturity       (WB GovTech Maturity Index xlsx, 2020/2022/2025)
 *  - open_data              (Open Data Watch ODIN via World Bank SPI mirror)
 *  - eparticipation         (UN E-Participation Index via QoG Standard TS)
 *
 * Each returns rows with `iso3` already known.
 */
import * as XLSX from "xlsx";
import type { IndicesDataPoint } from "./indices";

type Row = Array<string | number | null | undefined>;

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
  "VCT","VEN","VNM","VUT","WSM","YEM","ZAF","ZMB","ZWE",
]);

async function fetchText(url: string, timeoutMs = 30000, retries = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }
        return null;
      }
      return await res.text();
    } catch {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function fetchXlsx(url: string, timeoutMs = 60000): Promise<XLSX.WorkBook | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return XLSX.read(buf, { type: "array" });
  } catch {
    return null;
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

/* ── WEF Global Competitiveness Index 4.0 (global_competitiveness) ── */
const GCI_URL = "https://data360files.worldbank.org/data360-data/data/WEF_GCI/WEF_GCI_WIDEF.csv";

export async function fetchGci(): Promise<IndicesDataPoint[]> {
  const text = await fetchText(GCI_URL, 60000);
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const indIdx = headers.indexOf("INDICATOR");
  const areaIdx = headers.indexOf("REF_AREA");
  const unitIdx = headers.indexOf("UNIT_MEASURE");
  if (indIdx < 0 || areaIdx < 0 || unitIdx < 0) return [];

  // GCI 4.0 scored rows use UNIT_MEASURE = "0-100 scale"; year columns follow.
  const yearCols: { index: number; year: number }[] = [];
  for (let i = unitIdx + 1; i < headers.length; i++) {
    const y = parseInt(headers[i], 10);
    if (!isNaN(y) && y >= 2000) yearCols.push({ index: i, year: y });
  }
  if (yearCols.length === 0) return [];

  const points: IndicesDataPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols[indIdx] !== "WEF_GCI_GCI4") continue;
    if ((cols[unitIdx] ?? "").trim() !== "0_TO_100") continue;
    const iso3 = cols[areaIdx]?.toUpperCase();
    if (!iso3 || !KNOWN_ISO.has(iso3)) continue;
    for (const { index: ci, year } of yearCols) {
      const raw = cols[ci]?.trim();
      if (!raw || raw === "") continue;
      const val = parseFloat(raw);
      if (isNaN(val)) continue;
      points.push({ iso3, indicatorId: "global_competitiveness", year, value: val });
    }
  }
  return points;
}

/* ── World Bank GovTech Maturity Index (govtech_maturity) ────────── */
const GTMI_URL =
  "https://datacatalogfiles.worldbank.org/ddh-published/0037889/DR0095721/WBG_GovTech_Dataset_Dec2025.xlsx";

export async function fetchGovtechMaturity(): Promise<IndicesDataPoint[]> {
  const wb = await fetchXlsx(GTMI_URL);
  if (!wb) return [];
  const sheetName = wb.SheetNames.find((s) => s === "GTMI_Data") ?? wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[sheetName], { header: 1 });
  const header = rows[0] as Row;
  const codeIdx = header.indexOf("Code");
  const yearIdx = header.indexOf("Year");
  const gtmIdx = header.indexOf("GTMI");
  if (codeIdx < 0 || yearIdx < 0 || gtmIdx < 0) return [];

  const points: IndicesDataPoint[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as Row;
    const code = String(row[codeIdx] ?? "").trim().toUpperCase();
    if (!code || !KNOWN_ISO.has(code)) continue;
    const raw = row[gtmIdx];
    if (raw === undefined || raw === null || raw === "") continue;
    const val = parseFloat(String(raw));
    if (isNaN(val)) continue;
    const year = parseInt(String(row[yearIdx] ?? ""), 10);
    if (isNaN(year)) continue;
    points.push({ iso3: code, indicatorId: "govtech_maturity", year, value: val });
  }
  return points;
}

/* ── Open Data Inventory (open_data) via World Bank SPI mirror ───── */
const ODIN_URL =
  "https://raw.githubusercontent.com/worldbank/SPI/master/01_raw_data/2.2_DSOA/ODIN_2024.csv";

export async function fetchOpenData(): Promise<IndicesDataPoint[]> {
  const text = await fetchText(ODIN_URL, 60000);
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const ccIdx = headers.indexOf("Country Code");
  const yearIdx = headers.indexOf("Year");
  const overallIdx = headers.indexOf("Overall score");
  if (ccIdx < 0 || yearIdx < 0 || overallIdx < 0) return [];

  // ODIN scores each country once per category; overall = mean of category scores.
  const sums = new Map<string, { n: number; total: number; year: number }>();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const iso3 = (cols[ccIdx] ?? "").trim().toUpperCase();
    if (!iso3 || !KNOWN_ISO.has(iso3)) continue;
    const raw = (cols[overallIdx] ?? "").trim();
    if (!raw || raw === "-" || raw === "") continue;
    const val = parseFloat(raw);
    if (isNaN(val)) continue;
    const year = parseInt(cols[yearIdx], 10);
    const prev = sums.get(iso3) ?? { n: 0, total: 0, year };
    prev.n += 1;
    prev.total += val;
    if (year > prev.year) prev.year = year;
    sums.set(iso3, prev);
  }

  const points: IndicesDataPoint[] = [];
  for (const [iso3, s] of sums) {
    if (s.n === 0) continue;
    points.push({ iso3, indicatorId: "open_data", year: s.year, value: s.total / s.n });
  }
  return points;
}

/* ── UN E-Participation Index (eparticipation) via QoG Standard TS ── */
const QOG_URL = "https://www.qogdata.pol.gu.se/data/qog_std_ts_jan26.csv";

export async function fetchEparticipation(): Promise<IndicesDataPoint[]> {
  const text = await fetchText(QOG_URL, 180000);
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const codeIdx = headers.indexOf("ccodealp");
  const yearIdx = headers.indexOf("year");
  const eparIdx = headers.indexOf("egov_epar");
  if (codeIdx < 0 || yearIdx < 0 || eparIdx < 0) return [];

  const points: IndicesDataPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const iso3 = (cols[codeIdx] ?? "").trim().toUpperCase();
    if (!iso3 || !KNOWN_ISO.has(iso3)) continue;
    const year = parseInt(cols[yearIdx], 10);
    if (isNaN(year)) continue;
    const raw = (cols[eparIdx] ?? "").trim();
    if (!raw || raw === "") continue;
    const val = parseFloat(raw);
    if (isNaN(val)) continue;
    points.push({ iso3, indicatorId: "eparticipation", year, value: val });
  }
  return points;
}
