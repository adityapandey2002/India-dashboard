const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const db = new DatabaseSync(path.join(__dirname, "..", "data", "india.db"));

const ids = ["healthcare_idx","crime_idx","safety_idx","happiness_score","haq_idx","economic_freedom","pisa_score","press_freedom","corruption_idx","terrorism_idx","open_budget","disaster_risk","gender_gap","global_competitiveness","social_progress_idx","democracy_idx","rule_of_law","ai_readiness","network_readiness","startup_ecosystem","broadband_speed","qs_rank","epi","ccpi","air_quality","sdg_score","global_peace","egov_idx","eparticipation","open_data","digital_competitiveness"];

const stmt = db.prepare(
  `SELECT indicator_id, COUNT(*) as n, MIN(year) as ymin, MAX(year) as ymax
   FROM data_points WHERE indicator_id IN (${ids.map(() => "?").join(",")})
   GROUP BY indicator_id ORDER BY indicator_id`
);
const rows = stmt.all(...ids);
let hasData = 0;
let noData = 0;
for (const r of rows) {
  const n = Number(r.n ?? 0);
  if (n > 0) {
    console.log("✓ " + String(r.indicator_id).padEnd(22) + String(n).padStart(5) + " pts  " + String(r.ymin ?? "-") + "-" + String(r.ymax ?? "-"));
    hasData++;
  } else {
    noData++;
  }
}
// Find indicators still missing
const missing = ids.filter(id => !rows.find(r => r.indicator_id === id));
for (const id of missing) {
  console.log("✗ " + id.padEnd(22) + "    0 pts  (no data)");
  noData++;
}
console.log(`\nTotal: ${hasData} with data, ${noData} without`);
db.close();
