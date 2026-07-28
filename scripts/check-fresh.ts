import { getDb, query } from "../src/lib/db/client";
getDb();
const ids = ["patent_applications", "mobile_subs", "electricity_access"];
for (const id of ids) {
const r = query("SELECT MAX(fetched_at) as max FROM data_points WHERE indicator_id = ?", [id]) as { max: string }[];
console.log(id, "max_fetched:", r[0]?.max ?? "NULL");
const cnt = query("SELECT COUNT(*) as n FROM data_points WHERE indicator_id = ?", [id]) as { n: number }[];
console.log("  rows:", cnt[0]?.n);
}
