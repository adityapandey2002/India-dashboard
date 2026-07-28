import { getDb, query } from "../src/lib/db/client";
getDb();
const rows = query("SELECT indicator_id, COUNT(*) as pts, COUNT(DISTINCT country_iso3) as cnt FROM data_points GROUP BY indicator_id ORDER BY pts DESC") as { indicator_id: string; pts: number; cnt: number }[];
console.log("Indicator".padEnd(26), "Pts", "Cntrs");
for (const r of rows) {
  console.log(r.indicator_id.padEnd(26), String(r.pts).padStart(5), String(r.cnt).padStart(6));
}
console.log("---");
const total = query("SELECT COUNT(*) as n FROM data_points") as { n: number }[];
console.log("Total:", total[0].n, "data points");
