import { query } from "../src/lib/db/client";

async function main() {
  const total = (await query<{ n: number }>("SELECT COUNT(*) AS n FROM data_points"))[0].n;
  const indicators = (await query<{ n: number }>("SELECT COUNT(DISTINCT indicator_id) AS n FROM data_points"))[0].n;
  const totalInd = (await query<{ n: number }>("SELECT COUNT(*) AS n FROM indicators"))[0].n;
  const countries = (await query<{ n: number }>("SELECT COUNT(*) AS n FROM countries"))[0].n;
  const sources = (await query<{ n: number }>("SELECT COUNT(DISTINCT source) AS n FROM indicators"))[0].n;
  const byCategory = await query<{ category: string; cnt: number }>(
    "SELECT i.category, COUNT(*) AS cnt FROM indicators i JOIN data_points dp ON i.id = dp.indicator_id GROUP BY i.category ORDER BY cnt DESC"
  );
  const zeroPts = await query<{ id: string }>(
    "SELECT i.id FROM indicators i WHERE NOT EXISTS (SELECT 1 FROM data_points dp WHERE dp.indicator_id = i.id)"
  );

  console.log(`\n📊 India Dashboard — Data Status\n`);
  console.log(`  Data points:     ${total.toLocaleString()}`);
  console.log(`  Indicators:      ${indicators} with data, ${totalInd} total (${zeroPts.length} at 0 pts)`);
  console.log(`  Countries:       ${countries}`);
  console.log(`  Sources:         ${sources}`);
  console.log(`\n  By category:`);
  for (const c of byCategory) {
    console.log(`    ${c.category.padEnd(15)} ${c.cnt}`);
  }
  if (zeroPts.length > 0) {
    console.log(`\n  ⚠️  Zero-point indicators (${zeroPts.length}):`);
    for (const z of zeroPts) console.log(`    ${z.id}`);
  }
  const embed = await query<{ n: number }>("SELECT COUNT(*) AS n FROM embeddings");
  console.log(`\n  TF-IDF index:    ${embed[0].n} chunks`);
}

main().catch((err) => {
  console.error("Status check failed:", err);
  process.exit(1);
});
