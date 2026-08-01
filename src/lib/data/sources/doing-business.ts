/**
 * World Bank Ease of Doing Business score (archived series).
 *
 * The WB API retired IC.BUS.EASE.XQ in 2021, so we parse the official
 * historical archive workbook (DB2004-DB2020) instead.
 */

import * as XLSX from "xlsx";

export type DoingBusinessDataPoint = {
  iso3: string;
  indicatorId: string;
  year: number;
  value: number;
};

const ARCHIVE_URL =
  "https://archive.doingbusiness.org/content/dam/doingBusiness/excel/db-2021/Historical-Data--DB04-DB20-.xlsx";
const SHEET_HINTS = ["DB21 Data", "DB21", "Data"];

function findSheet(workbook: XLSX.WorkBook): string | undefined {
  for (const hint of SHEET_HINTS) {
    const match = workbook.SheetNames.find((s) => s.includes(hint) || hint.includes(s));
    if (match) return match;
  }
  return workbook.SheetNames[0];
}

export async function fetchDoingBusiness(): Promise<DoingBusinessDataPoint[]> {
  const res = await fetch(ARCHIVE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    console.warn(`  ⚠ Doing Business archive: HTTP ${res.status} ${res.statusText}`);
    return [];
  }

  const buf = await res.arrayBuffer();
  const workbook = XLSX.read(buf, { type: "array" });
  const sheetName = findSheet(workbook);
  if (!sheetName) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1 });

  const headerIdx = rows.findIndex(
    (r) => Array.isArray(r) && String(r[0] ?? "").includes("Country code"),
  );
  if (headerIdx < 0) return [];

  const points: DoingBusinessDataPoint[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const iso3 = String(row[0] ?? "").trim().toUpperCase();
    const dbYear = parseInt(String(row[4] ?? ""), 10);
    if (!/^[A-Z]{3}$/.test(iso3) || isNaN(dbYear)) continue;

    const rawScore = row[5] ?? row[6];
    if (rawScore === undefined || rawScore === null || rawScore === "") continue;
    const score = parseFloat(String(rawScore));
    if (isNaN(score)) continue;

    points.push({ iso3, indicatorId: "ease_of_doing_business", year: dbYear, value: score });
  }

  return points;
}
