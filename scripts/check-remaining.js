const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const d = new DatabaseSync(path.join(__dirname, "..", "data", "india.db"));

// Count per indicator
const rows = d.prepare("SELECT i.id, i.name, COUNT(dp.country_iso3) as n FROM indicators i LEFT JOIN data_points dp ON dp.indicator_id = i.id GROUP BY i.id ORDER BY n DESC").all();
console.log("Indicator data counts:");
for (const r of rows) {
  const label = (r.id + "       ").slice(0, 30) + (r.name + "       ").slice(0, 35);
  console.log(`  ${label} ${r.n} pts`);
}

// Total
const total = d.prepare("SELECT COUNT(*) as n FROM data_points").all();
const totInd = d.prepare("SELECT COUNT(*) as n FROM indicators").all();
const withData = d.prepare("SELECT COUNT(DISTINCT indicator_id) as n FROM data_points").all();
console.log(`\n${total[0].n} data points across ${withData[0].n}/${totInd[0].n} indicators`);
d.close();
