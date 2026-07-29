const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const db = new DatabaseSync(path.join(process.cwd(), "data", "india.db"));
db.exec("DROP TABLE IF EXISTS embeddings");
db.exec(`CREATE TABLE IF NOT EXISTS embeddings (
  id            TEXT PRIMARY KEY,
  chunk_text    TEXT NOT NULL,
  source        TEXT NOT NULL,
  indicator_id  TEXT,
  country_iso3  TEXT,
  year          INTEGER,
  embedding     TEXT
)`);
console.log("Recreated embeddings table with TEXT column");
db.close();
