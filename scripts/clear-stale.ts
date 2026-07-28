import { getDb, execute } from "../src/lib/db/client";
getDb();
const ids = ["uhc_idx", "road_safety", "co2_per_capita"];
execute(`DELETE FROM data_points WHERE indicator_id IN (${ids.map(() => "?").join(",")})`, ids);
console.log("Cleared");
