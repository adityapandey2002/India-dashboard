import { getDb, execute } from "../src/lib/db/client";
getDb();
const ids = ["uhc_idx", "road_safety", "co2_per_capita", "gov_effectiveness", "political_stability", "regulatory_quality", "voice_accountability", "control_corruption"];
execute(`DELETE FROM data_points WHERE indicator_id IN (${ids.map(() => "?").join(",")})`, ids);
console.log("Cleared");
