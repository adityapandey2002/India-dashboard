# BUGFIX_PLAN.md

> Implementation plan for the defects found in the India Dashboard.
> Verified against working tree `d259d8e`, the live `data/india.db`, `npm test`,
> `npx tsc --noEmit`, `npm run lint`, and DNS resolution. **2026-10-04**.
>
> This plan supersedes the bug list in `PROJECT_CONTEXT.md` §16 where they disagree —
> several of that section's claims were wrong. See §0.3 below.

---

## 0. Verification pass — read this before touching anything

### 0.1 Measured baseline (today, not quoted from docs)

| Command | Result |
|---|---|
| `npx tsc --noEmit` | passes (exit 0) |
| `npm test` | **51 passing across 7 files** (41.1s) |
| `npm run lint` | **FAILS — 21 errors, 24 warnings** |
| `npm run build` | not run — untested baseline |

`npm run lint` has **never** passed in the current tree. Errors concentrate in files this
plan already touches: `scripts/check-remaining.cjs` (a *parse* error — see 0.3-i),
`scripts/ingest.ts`, `src/lib/db/client.ts:14,15,27,108`, `src/app/api/ai/chat/route.ts:215`,
`src/app/api/ai/insights/route.ts:65`, `src/components/dashboard/world-map-card.tsx:139,150`,
`src/app/page.tsx`, `src/app/methodology/page.tsx`, and three more.

**Do not blanket-disable rules to get green.** Fix them, or record a reviewed exception with a
written reason.

### 0.2 Confirmed exactly as documented

Production DB story broken (`client.ts:17-19, 27-34`) · SQLite unusable on Vercel ·
`migrate-pg` points at a nonexistent file · `/api/ai/insights` module-scope `new Groq()` at `:5`
with **0 call sites** · `ingest.ts` never reads `process.argv` in 577 lines ·
rank card `findIndex` on a `limit=10` leaderboard (`indicator/[id]/page.tsx:43,127`) ·
`/country/IND` radar self-compare (`country/[iso3]/page.tsx:69`) · TF-IDF slice
(`index-embeddings.ts:50-51`) · Playwright `:3456` with no `webServer` ·
`set NODE_OPTIONS=…&&` in 6 scripts · `data_points.rank` dead (`client.ts:136,197`) ·
no `middleware.ts`, empty `next.config.ts`, `err.message` leaked at `insights:66` and
`chat:244` · no `ThemeProvider` in `layout.tsx:28-38` · `<Toaster/>` never mounted ·
`getEmbedding`/`getEmbeddings` have 0 call sites.

### 0.3 Claims from `PROJECT_CONTEXT.md` §16 that are WRONG or understated

**(a) `migrate-pg` cannot be repaired — there is nothing to repair.**
`scripts/migrate-to-pg.mjs:15` imports `../src/lib/db/client.mjs`, **which does not exist**.
Its body (`:33-42`) only runs `SELECT COUNT(*)` per table and then prints
*"To migrate, set DATABASE_URL and run ingest.ts directly."* There is no migration code.
**Delete the file and the npm script.** The real path is already documented in `AGENTS.md:33-38`.

**(b) The TF-IDF bug is catastrophic, not a coverage nit.**
Queried live:

```
embeddings rows:                          50,000
DISTINCT indicator_id in embeddings:         23      ← of 117 indicators that HAVE data
indicators with data but ZERO chunks:        94
data points unreachable by /chat:       200,623  (of 252,834)
alphabetical range:                age_dependency … fdi_inflow_usd
```

`/chat` **cannot answer anything** about GDP, HDI, life expectancy, Gini, internet penetration,
poverty, patents, or rule of law. The 23 survivors are alphabetically first and happen to be
alphabetically obscure. Treat as top-of-Wave-1.

**(c) There are two trend thresholds, not three.** Home `<0.5`, country `<0.5`, report card
`<0.1`. Three call sites, two values — smaller than implied, but the report-card CSV export
(`report-card/page.tsx:226`) emits `trendLabel`, so it leaks into a downloadable artefact.

**(d) The two percentile formulas differ by ≤1pp — it is a *labelling* problem.**

| rank of N=217 | `rankings.ts` | `report-card.ts` |
|---|---|---|
| 1 | 100.0 | 100.0 |
| 100 | 54.2 | 54.4 |
| last | 0.0 | 0.46 |

`/methodology/page.tsx:24` documents `100 × (1 − (rank − 1)/total)` — **algebraically identical
to `report-card.ts`**. So methodology agrees with one path and disagrees with the other, and
**`rankings.ts` is the outlier**. That asymmetry makes the fix cheap.

**(e) `fmtBig` ≠ `fmtValue`. Swapping them is a VISUAL change, not a refactor.**

| | `page.tsx fmtBig` | `format.ts fmtValue` |
|---|---|---|
| prefix | hardcoded `$` | none |
| 1e9 | `"$3.4B"` | `"3.39B"` |
| 1e3 | `"12,345"` | `"12.3k"` |
| locale | runtime default | hardcoded `"en-US"` |

Today the GDP KPI renders `"$3.85T"`; `fmtValue(v, "US$")` renders `"3.85T US$"`. Also 9 of the
12 KPI cards hand-roll formats (`hdi.toFixed(3)`, `internet.toFixed(0)%`) that `fmtValue`
**cannot express** — it appends a space before the unit, which `format.test.ts:37,42` assert
deliberately. Prefer converting only `fmtBig`/`fmtPlain`.

**(f) `zod` must NOT be deleted.** It is one of the 7 "unused" deps *and* the prescribed fix for
input validation. Same for `world-atlas` — it is the provenance of the committed
`public/world-110m.json`. **Net: 5 removable** (`drizzle-orm`, `drizzle-kit`, `zustand`,
`papaparse`, `d3-scale`) **+ 2 to keep** (`zod` → use it; `world-atlas` → justify). Also drop
`@types/better-sqlite3` (project uses `node:sqlite`, which has its own ambient types) and
`@types/papaparse`.

**(g) "The Supabase host is dead (ENOTFOUND)" is FACTUALLY WRONG.**
`Resolve-DnsName db.fzibhydljxjqrulwwykp.supabase.co` returns
`AAAA 2406:da14:…` — **DNS resolves, IPv6-only**. The TCP failure from this machine is
*"no IPv6 route"*, **not NXDOMAIN**. Vercel *does* have IPv6. Consequences:

1. **The project may not be dead at all.** Production could be broken for an unrelated reason.
2. **The failure mode is probably a hang, not a 500.** `pg.Pool` defaults to
   `connectionTimeoutMillis: 0` (wait forever) with exponential reconnect backoff.

**Do not create a new Supabase project until the Wave 0 diagnostic has run.**

**(h) More count drift, and my guide count was wrong.**

| Metric | Docs claim | **Live DB** |
|---|---|---|
| indicators / with data | 120 / 100 | **123 / 117** |
| data points | 105,740 | **252,834** |
| sources | 34 | **33** |
| zero-point indicators | 20 | **6** |
| `LOWER_IS_BETTER` size | 37 | **35** |
| hand-written indicator guides | ~68 | **41** → **82 of 123 fall back** |
| current commit (AGENTS.md says `1b29d85`) | — | **`b714455`** |
| `PROJECT_CONTEXT.md` §16.3 #20 / §9.1 / §6.6 all say "37" | | **35** |

**(i) Two repo-hygiene corrections:** `dev-server.log` is **committed**, not gitignored
(`.gitignore` only has `/out.log` and `/out/`). And `check-remaining.cjs:20` is a **parse
error** — `console.log("…" " + String(…))`, two adjacent string literals with no operator.

**(j) `/rankings` already hides zero-point indicators** (`rankings/page.tsx:13-14` filters
`c.dataPoints > 0`). `PROJECT_CONTEXT.md` §17.2 #39 claimed they appear in "the Rankings
selector" — they do not. Only `/explore` shows them.

**(k) `report-card.tsx` → it's `src/app/report-card/page.tsx:12`** that holds `PEER = "CHN"`.
`src/lib/report-card.ts` is the pure scoring module and has no peer constant.

### 0.4 Nine NEW defects not in `PROJECT_CONTEXT.md` §16

**N1 (HIGH) — `vectorSearch()` returns mis-attributed citations.**
`src/lib/ai/vector-search.ts:124-137` pushes into `docVectors` **only on successful parse**, but
`:150-152` indexes `rows[i]` and `docVectors[i]` **in lockstep**:

```ts
for (const row of rows) {
  if (!row.embedding) continue;
  try {
    docVectors.push(new Map(Object.entries(JSON.parse(row.embedding))));  // only on success
  } catch { /* row dropped — but rows[] index is not */ }
}
for (let i = 0; i < parsedCount; i++) {
  const row = rows[i];                                    // MISALIGNED permanently
  const similarity = cosineSimilarity(queryVec, docVectors[i]);
```

One malformed `embedding` shifts every subsequent vector by one, so `/chat` cites the **wrong
data point and the wrong proof URL** for every answer after it. `chat/route.ts:237-239` turns
those ids into user-visible `citations[]`. For a dashboard whose pitch is verifiable citations,
this is a trust bug — and there is **no test on this path**.

**N2 (HIGH) — `LIMIT 50000` with no `ORDER BY`** (`vector-search.ts:112-114`). Non-deterministic
on both engines: the same question retrieves different chunks across restarts.

**N3 (MED) — the 50k cap is load-bearing.** `:114` mirrors the index build cap. If the build cap
rises, this must rise with it.

**N4 (MED) — `sources` is missing three rows, not one.** Diffing `INDICATORS[].source` against
`SOURCES[]`:

| missing | indicators affected |
|---|---|
| `wgi` | **6** (`gov_effectiveness`, `political_stability`, `regulatory_quality`, `voice_accountability`, `control_corruption`, `rule_of_law`) |
| `owid` | 3 (`co2_per_capita`, `fossil_fuel_energy`, `patents_per_million`) |
| `unhcr` | 1 (`refugee_population`) |

Plus two orphans pointing the other way: `ei` and `itu` are in `SOURCES[]` but no indicator
declares them. `page.tsx:246` prints the footer from this table, so it is wrong in both directions.

**N5 (MED) — `epi` is a fetcher BUG, not a missing source.** Five of the six zero-point
indicators genuinely have no fetcher. But `epi` is fully implemented and wired:
`indices.ts:263` `EPI_URL`, `:265` `export async function fetchEpi()`, registered at
`ingest.ts:506` **and** `ingest-new.ts:107` — and produces **0 rows**. Cheapest of the six to
recover. Suspects: rotated URL, `header.indexOf("EPI.new")` returning −1 (silent no-op at `:272`),
`resolveIso3` miss, or the hardcoded `year: 2024` at `:284`.

**N6 (MED) — `?limit=-1` is engine-divergent.** `leaderboard/route.ts:14` has no range check.
SQLite treats `LIMIT -1` as unbounded; **PostgreSQL raises `LIMIT must not be negative`**. The
same URL 200s locally and 500s in production. `?year=abc` → `NaN` likewise.

**N7 (LOW) — stale call site after `b714455`.** `getLeaderboard` gained a 4th `higherBetter`
param (`queries.ts:129`); `insights/route.ts:30` still passes 3 args.

**N8 (LOW) — `runPgMigrations()` calls `getDb()`** (`client.ts:167`). Works only because
`_pgPool` is assigned at `:31` before `:32` awaits. Reorder those lines → unbounded recursion.
That `any` typing is also why the hazard was invisible (and it costs 4 lint errors).

**N9 (LOW) —** `scripts/check-remaining.cjs` does not parse; `dev-server.log` is committed; no
`LICENSE` file despite README saying MIT.

---

## 1. Wave 0 — Unblock production (blocks everything else from being verifiable)

### Step 0.1 — Diagnose the real failure (30 min, blocking, **no code change**)

Per 0.3-g, the premise is wrong. Run this before anything else:

```powershell
# A. What does Vercel actually have?
npx vercel env ls production
npx vercel logs <deployment-url> --since 2h

# B. Does the old host accept connections? (must be run FROM Vercel too —
#    this machine has no IPv6 route, so a local failure is not conclusive)
$env:DATABASE_URL="postgresql://<user>:<pass>@db.fzibhydljxjqrulwwykp.supabase.co:5432/postgres"
node -e "const{Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});c.connect().then(()=>c.query('select 1')).then(r=>{console.log('OK',r.rows);return c.end()}).catch(e=>{console.error('FAIL',e.code,e.message);process.exit(1)})"

# C. Observe hang-vs-500
$env:DATABASE_URL="postgresql://u:p@db.does-not-exist-zzz.supabase.co:5432/postgres"
npm run dev    # then: curl -m 30 -o /dev/null -w '%{http_code}' http://localhost:3000/
```

| Result | Meaning | Next |
|---|---|---|
| **B connects** | Project alive; the 500 has another cause (wrong password, pooler port 6543 vs 5432, RLS, project paused) | env fix only, ~20 min |
| **B fails ENOTFOUND** | Host truly gone | Step 0.2 |
| **B hangs >8s** | Confirms the hang mode | Step 0.2 **+ 0.3 (mandatory)** |

**Note the pooler.** Supabase hands out `*.pooler.supabase.com:6543` (transaction) and `:5432`
(session). A `db.<ref>.supabase.co` host is the *direct* connection and is IPv6-only for new
projects. **The pooler URL is the one that works from serverless.**

**Also, before any re-seed: dump any database you still have.** §16.7 notes the dataset is *not
reproducible* — Doing Business (2021) and WEF GCI (2019) are discontinued and nothing is
snapshotted. That is more valuable than the provider choice.

### Step 0.2 — Establish a working production DB (1–4 h, no code change)

Product decision — see §7.7. Whichever provider: set the **pooler** URL in Vercel production env,
then seed with `DATABASE_URL=… npm run ingest` and `DATABASE_URL=… npm run index-embeddings`, then
`npx vercel --prod` and smoke-test all 9 routes.

### Step 0.3 — Make DB failures fast, loud, and typed (1 h, 3 files)

Independent of 0.1/0.2 and worth doing regardless — it converts an un-diagnosable outage into a
diagnosable one.

`src/lib/db/client.ts:31`:
```ts
_pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 8_000),
  idleTimeoutMillis: 30_000,
  max: Number(process.env.PG_POOL_MAX ?? 4),   // serverless-safe; pg's default 10 can exhaust PG
  statement_timeout: 15_000,
  application_name: "india-dashboard",
});
```
`pool.query()` at `:172` runs the whole DDL block; without a statement timeout one slow
`CREATE INDEX` hangs the render indefinitely.

`src/lib/db/client.ts:166-234` — change `runPgMigrations()` to **take the pool as a parameter**
(fixes N8), and wrap the call:
```ts
try {
  await runPgMigrations(_pgPool);
} catch (err) {
  const code = (err as { code?: string }).code;
  throw new Error(
    `Database unreachable or migration failed (${code ?? "unknown"}). ` +
    `Check DATABASE_URL (Supabase direct connections are IPv6-only — prefer the pooler host). ` +
    `Underlying: ${(err as Error).message}`,
    { cause: err },
  );
}
```

**Verify:** with a deliberately bad `DATABASE_URL`, `curl -m 15 …/` returns in **~8s** with a
server log naming the cause — not a 60s hang.

### Step 0.4 — Gate the deploy (1 h)

Nothing prevents shipping a broken build: no CI, no `verify` script, and lint is red. Add
`.github/workflows/verify.yml`: `npm ci → lint → typecheck → test → build`. Without this, items 1
and 9 silently regress.

**Wave 0 exit:** prod 200 on all 9 routes · DB failure is fast and typed · `DATABASE_URL`
documented in `.env.example` with the pooler note · lint baseline decision recorded.

---

## 2. Wave 1 — Correctness bugs (ordered by user-visible damage)

### Step 1.1 — `/chat` mis-attributed citations (N1 + N2) — `src/lib/ai/vector-search.ts` — **S, 30 min — HIGHEST harm in this wave**

Replace `:103-168` so parsed vectors and rows stay in lockstep, and make the cap deterministic:

```ts
const rows = await query<EmbeddingRow>(
  `SELECT id, chunk_text, source, indicator_id, country_iso3, year, embedding
     FROM embeddings
    WHERE embedding IS NOT NULL AND embedding != ''
    ORDER BY indicator_id, country_iso3, year     -- deterministic; no ORDER BY = arbitrary 50k
    LIMIT ?`,
  [SEARCH_LIMIT],
);
if (rows.length === 0) return null;

// Only a successfully-parsed row may enter `docs`, so index alignment between
// `docs` and its metadata is structurally guaranteed.
const docs: Array<{ row: EmbeddingRow; vec: Map<string, number> }> = [];
const docFreq = new Map<string, number>();
let malformed = 0;

for (const row of rows) {
  try {
    const vec = new Map(Object.entries(JSON.parse(row.embedding!) as Record<string, number>));
    if (vec.size === 0) { malformed++; continue; }
    docs.push({ row, vec });
    for (const term of vec.keys()) docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
  } catch { malformed++; }          // drop BOTH sides together
}
if (docs.length === 0) return null;
if (malformed > 0) console.warn(`[vector-search] skipped ${malformed} malformed embeddings`);

const scored: SearchResult[] = [];
for (const { row, vec } of docs) {
  const score = cosineSimilarity(queryVec, vec);
  if (score > 0) scored.push({ id: row.id, text: row.chunk_text, source: row.source, score });
}
```

Add one shared constant so build and query can never drift (N3):
```ts
// src/lib/ai/index-config.ts
export const MAX_CHUNKS = Number(process.env.MAX_CHUNKS ?? 50_000);
```
imported by **both** `scripts/index-embeddings.ts` and `src/lib/ai/vector-search.ts`.

**Verify:** new `src/lib/ai/vector-search.test.ts` — mock `query` to return
`[{…, embedding:"not-json"}, {id:"good", embedding:'{"a":5}'}]`; assert the surviving result has
`id === "good"`. Pre-fix this returns the wrong id or throws. Then manually confirm
`citations[].id` values resolve to real `embeddings.id` rows for 3 questions.

**Blast radius:** `/api/ai/chat` only. No shared pure logic. No existing test for this path.

### Step 1.2 — TF-IDF stratifies across indicators — `scripts/index-embeddings.ts` — **M, 2 h**

Replace `ORDER BY … slice(0, 50000)` with a **point-balanced quota**: equal budget per indicator,
sampled as the most recent N years for every country. Also stops the script materialising all
252,834 rows in memory.

```ts
import { MAX_CHUNKS } from "../src/lib/ai/index-config";

/** Newest N years kept per country per indicator. 3 balances recency vs breadth. */
const YEARS_PER_INDICATOR = Number(process.env.TFIDF_YEARS ?? 3);

// 1. Equal budget per indicator so alphabetical order cannot starve anyone.
const ids = await query<{ indicator_id: string }>(
  `SELECT DISTINCT indicator_id FROM data_points WHERE value IS NOT NULL`,
);
const perIndicator = Math.max(1, Math.floor(MAX_CHUNKS / ids.length));   // 427 @ 50k/117

// 2. Per indicator: newest YEARS_PER_INDICATOR years for EVERY country, so country
//    coverage stays uniform (no country crowding out another).
const chunks: Chunk[] = [];
for (const { indicator_id } of ids) {
  const rows = await query<DataPoint>(
    `SELECT dp.indicator_id, i.name AS indicator_name, dp.country_iso3, dp.year, dp.value, i.unit
       FROM data_points dp JOIN indicators i ON i.id = dp.indicator_id
      WHERE dp.indicator_id = ? AND dp.value IS NOT NULL
        AND dp.year >= (SELECT MAX(year) - ? FROM data_points
                         WHERE indicator_id = ? AND value IS NOT NULL)
      ORDER BY dp.country_iso3, dp.year
      LIMIT ?`,
    [indicator_id, YEARS_PER_INDICATOR - 1, indicator_id, perIndicator],
  );
  chunks.push(...rows.map(toChunk));
}

// 3. If the sum overshoots, trim by STRIDE — never a head/tail slice, so overflow
//    thins every indicator evenly.
const kept = chunks.length > MAX_CHUNKS
  ? Array.from({ length: MAX_CHUNKS },
               (_, i) => chunks[Math.floor(i * chunks.length / MAX_CHUNKS)])
  : chunks;
```

**Do NOT change:** `BATCH_SIZE`, the top-50-terms-per-chunk rule (`:110`), `idf` smoothing
(`:86`), or `bulkInsert` (`:135`). Those are fine.

**Acceptance test — this is the whole point:**
```sql
SELECT COUNT(DISTINCT indicator_id) FROM embeddings;        -- must be 117 (was 23)
SELECT MIN(indicator_id), MAX(indicator_id) FROM embeddings;  -- must NOT both be a*–f*
SELECT COUNT(DISTINCT country_iso3) FROM embeddings;         -- ~200+
```
Then ask `/chat` "What is India's HDI?" and "What is India's Gini coefficient?" — both previously
unanswerable; both must now cite. Log elapsed time before/after; it should *drop*.

**Blocked by Wave 0** — you need a reachable DB to rebuild.

### Step 1.3 — "World rank of India" card — `src/app/indicator/[id]/page.tsx` — **S, 20 min**

`:127` can only ever print `#1`–`#10`, and the card immediately left (`:95-103`) already prints
the true global rank from `getRankInYear`. **There is no correct form of the `findIndex`
expression** — a limit-10 list cannot express a rank of 137. Delete the duplicate card:

```diff
     <Card><CardContent className="p-4">
       <p className="text-xs text-muted-foreground">Global rank</p>
       <p className="mt-1 text-2xl font-semibold tabular-nums">{rank ? `#${rank.rank}` : "—"}</p>
       <p className="text-xs text-muted-foreground">{rank ? `of ${rank.total} countries` : "no data"}</p>
     </CardContent></Card>
-  <Card><CardContent className="p-4">
-    <p className="text-xs text-muted-foreground">World rank of India (top 10)</p>
-    <p className="mt-1 text-2xl font-semibold tabular-nums">
-      {indiaRow ? `#${leaderboard.findIndex((r) => r.iso3 === INDIA) + 1}` : "—"}
-    </p>
-    <p className="text-xs text-muted-foreground">in {year ?? "latest"} year</p>
-  </CardContent></Card>
```

Then drop the dead `:45 indiaRow` and change `:87` to `sm:grid-cols-3`. **Keep** `:43 leaderboard`
— the Top-10 table at `:208-241` still uses it.

**Verify:** `/indicator/life_expectancy` or `/indicator/gini` (India ≈ #100–130) shows one rank
figure above 10, matching `/rankings?indicator=<same>`. E2E `:169` only greps "Global rank". ✅

### Step 1.4 — `/country/IND` degenerate radar — `src/app/country/[iso3]/page.tsx` — **S, 30 min**

`site-nav.tsx` links `/country/IND`, so this is the most-linked URL in the app.

```diff
+ const INDIA = "IND";
+ const isIndia = code === INDIA;
+ // On India's own page there is nothing to compare against — use a real peer so the
+ // radar stays informative instead of overlapping itself.
+ const peerCode = isIndia ? "CHN" : INDIA;

 const [snapshot, history, ranks] = await Promise.all([
   getLatestSnapshot(code), getCountryHistory(code),
-  getLatestRanks(allIndicators.map(i => i.id), [code, "IND"]),
+  getLatestRanks(allIndicators.map(i => i.id), [...new Set([code, peerCode])]),
 ]);
```
```diff
   const radarData = catScores.filter(c => c.country != null && c.peer != null).map(c => ({
     category: c.category.replace(/_/g, " "),
     Country: Math.round(c.country!),
-    India: Math.round(c.india!),
+    India: Math.round(c.peer!),
   }));
```
…and give `CountryRadar` an explicit `peerName` prop (`country-radar.tsx:7,14,25`) rather than
hardcoding `name="India"` at `:25`. `new Set` also fixes the redundant `"?, ?"` param pair.

**Verify:** `/country/IND` shows two visibly different series labelled India and China;
`/country/USA` byte-identical to today. The health sweep asserts **zero console errors**, so
confirm no duplicate-key warning. **E2E `:249-270` only checks H1/score/panels — safe.**

### Step 1.5 — `npm run ingest:wb` honours its argv — `scripts/ingest.ts` — **M, 1 h**

```ts
/** `npm run ingest:wb` → only World Bank. Bare `npm run ingest` → everything. */
const requested = new Set(process.argv.slice(2).filter(Boolean));
const only = (sourceId: string) => requested.size === 0 || requested.has(sourceId);

const KNOWN = new Set(["world_bank","undp","who","owid","wgi","owid-generic","numbeo","ti",
                       "un","extra","sdg","indices","doing_business"]);
const unknown = [...requested].filter(s => !KNOWN.has(s));
if (unknown.length) throw new Error(`Unknown source id(s): ${unknown.join(", ")}. Known: ${[...KNOWN].join(", ")}`);
```
Then wrap each of the 12 blocks in `if (only("<id>")) { … }` at `:211-227` (world_bank),
`:229-249` (undp), `:251-274` (who), `:276-301` (owid), `:303-329` (wgi), `:331-357`
(owid-generic), `:359-383` (numbeo), `:385-409` (ti), `:411-435` (un), `:437-462` (extra),
`:464-488` (sdg), `:490-543` (indices), `:545-565` (doing_business).

**Risk: medium** — 12 edits in a 577-line script. All are additive guards; no SQL or parsing
changes. **Do not** refactor the blocks into a registry array in the same pass.

**Verify:** `ingest:wb` prints ⏭ for every non-WB block; `ingest:wb bogus` exits non-zero;
`npm run ingest` behaves exactly as today.

### Step 1.6 — Delete the broken migration stub — `package.json`, `scripts/` — **S, 15 min**

```diff
-    "migrate-pg": "set NODE_OPTIONS=--no-warnings&& tsx scripts/migrate-to-pg.ts",
```
```bash
git rm scripts/migrate-to-pg.mjs scripts/check-remaining.cjs scripts/check-remaining.js
```
Deleting `check-remaining.cjs` also clears one of the 21 lint errors (it is a parse error).
Update `AGENTS.md:24-40` and README to state plainly: **there is no SQLite→PG migration script;
set `DATABASE_URL` and run `npm run ingest`.**

### Step 1.7 — Playwright self-starts — `playwright.config.ts`, `package.json` — **S, 30 min**

```ts
export const E2E_PORT = 3456;   // deliberately not 3000: lets a dev server keep
                                // running on 3000 while E2E runs on 3456
export default defineConfig({
  testDir: "./e2e",
  // …
  use: { baseURL: `http://localhost:${E2E_PORT}`, /* … */ },
  webServer: {
    command: `next dev --port ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}/api/health-probe`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,     // first compile of 9 routes is slow
    stdout: "pipe",
  },
});
```
```ts
// src/app/api/health-probe/route.ts — so `url` doesn't wait on a full data render
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json({ ok: true, ts: Date.now() }); }
```
Add scripts: `e2e`, `e2e:ui`, `e2e:report`.

### Step 1.8 — POSIX-safe npm scripts — `package.json` — **S, 20 min**

`set NODE_OPTIONS=…&&` is `cmd` syntax. In `sh`, `set VAR=value` marks a positional parameter and
exports nothing — so on Linux CI `NODE_OPTIONS` is silently unset and `node:sqlite`'s
`ExperimentalWarning` floods stdout on every DB call, potentially corrupting stream parsers.
Use `cross-env` (the only thing that works in cmd, PowerShell, sh *and* bash):

```json
"dev":     "cross-env NODE_OPTIONS=--no-warnings next dev",
"lint":    "eslint",
"typecheck":"tsc --noEmit",
"test":    "vitest run",
"verify":  "npm run lint && npm run typecheck && npm test && npm run build",
"e2e":     "playwright test",
"ingest":          "cross-env NODE_OPTIONS=--no-warnings tsx scripts/ingest.ts",
"ingest:wb":       "cross-env NODE_OPTIONS=--no-warnings tsx scripts/ingest.ts world_bank",
"ingest:new":      "cross-env NODE_OPTIONS=--no-warnings tsx scripts/ingest-new.ts",
"index-embeddings":"cross-env NODE_OPTIONS=--no-warnings tsx scripts/index-embeddings.ts",
"status":          "cross-env NODE_OPTIONS=--no-warnings tsx scripts/status.ts"
```
`npm i -D cross-env@^7` (v7 is CJS; v10 requires ESM-aware consumers — pick deliberately).

Optionally use `--disable-warning=ExperimentalWarning` (Node 21.3+) instead, to keep other warnings.

**Verify on all three shells** (bash, cmd, PowerShell) — that is the whole point.

### Step 1.9 — `/api/ai/insights` stops exploding — **S, 20 min**

Route it through the same `chat()` helper `/api/ai/chat` uses, so there is one Groq path:

```diff
-import { Groq } from "groq-sdk";
-const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
+import { chat } from "@/lib/ai";

 export async function POST(req: NextRequest) {
+  if (!process.env.GROQ_API_KEY) {
+    return NextResponse.json({ error: "AI unavailable. Set GROQ_API_KEY to enable." }, { status: 503 });
+  }
   try {
-    const { iso3 = "IND", year } = await req.json();
+    const { iso3 = "IND", year } = await req.json();
+    if (typeof iso3 !== "string" || !/^[A-Z]{3}$/.test(iso3)) {
+      return NextResponse.json({ error: "iso3 must be a 3-letter ISO code" }, { status: 400 });
+    }
-      getLeaderboard("gdp_current_usd", year ?? new Date().getFullYear(), 10),
+      getLeaderboard("gdp_current_usd", year ?? new Date().getFullYear(), 10, true),   // N7
-    const completion = await groq.chat.completions.create({ /* … */ });
-    return NextResponse.json({ analysis: completion.choices[0]?.message.content ?? "" });
+    const analysis = await chat([{ role: "user", content: prompt }], { maxTokens: 300 });
+    if (!analysis) return NextResponse.json({ error: "AI unavailable…" }, { status: 503 });
+    return NextResponse.json({ analysis });
   } catch (err) {
-    return NextResponse.json({ error: err.message }, { status: 500 });
+    console.error("[api/ai/insights]", err);
+    return NextResponse.json({ error: "Failed to generate analysis" }, { status: 500 });
   }
 }
```
This also removes the last `groq-sdk` call site, letting you drop `groq-sdk` from
`dependencies` — one dead dep removed for free. And it clears a lint error (`catch (err: any)`).

**But see §7.5 — the route has 0 callers and may be better deleted outright.**

---

## 3. Wave 2 — Security

### Step 2.1 — Rate-limit the AI routes — **M, 2 h**

Both routes proxy a metered third-party API (Groq) at zero cost control. In-memory state dies
with the lambda, so use **Upstash Redis + `@upstash/ratelimit`** in production, with an in-memory
fallback for dev:

```ts
// src/lib/rate-limit.ts
const limiters = {
  chat:     new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:chat" }),
  insights: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,  "1 h"), prefix: "rl:ins" }),
};
export async function checkRateLimit(key: "chat" | "insights", ip: string) {
  if (process.env.NODE_ENV !== "production" || !process.env.UPSTASH_REDIS_REST_URL) {
    /* in-memory Map fallback so local work is unblocked */
  }
  const { success, remaining, reset } = await limiters[key].limit(ip);
  return { ok: success, remaining, reset };
}
```
```ts
// in both AI routes
const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
const rl = await checkRateLimit("chat", ip);
if (!rl.ok) {
  return NextResponse.json(
    { error: "Too many requests. Try again later." },
    { status: 429, headers: { "Retry-After": "3600", "X-RateLimit-Remaining": String(rl.remaining) } },
  );
}
```
On Vercel, `req.ip` was removed in favour of headers; `x-forwarded-for` is correct.

**Independently of the limiter: set a hard usage cap in the Groq console.** A rate limiter
bypassable by rotating IPs is not a financial control.

### Step 2.2 — Real input validation with `zod` — **M, 2 h**

```ts
// src/lib/validation.ts
import { z } from "zod";
export const iso3 = z.string().regex(/^[A-Z]{3}$/, "must be a 3-letter ISO3 code");
export const indicatorId = z.string().min(1).max(80).regex(/^[a-z0-9_]+$/, "snake_case only");

export const leaderboardQuery = z.object({
  indicator: indicatorId,
  year:  z.coerce.number().int().min(1900).max(2100).optional(),
  limit: z.coerce.number().int().min(1).max(300).default(30),   // ← kills N6
});
export const seriesQuery  = z.object({ country: iso3, indicator: indicatorId });
export const scatterQuery = z.object({ x: indicatorId, y: indicatorId });
export const rankingsQuery = z.object({ indicator: indicatorId });

export const chatBody = z.object({
  question: z.string().trim().min(1).max(1_000),
  conversationHistory: z.array(
    z.object({ role: z.enum(["system","user","assistant"]), content: z.string().max(4_000) })
  ).max(20).optional(),
});
```
Apply at `leaderboard:8-15`, `series:7-11`, `rankings:6-9`, `scatter:28-32`, `chat:178-182`,
`insights:22`.

**Behaviour changes (all desirable):** `?limit=-1` → 400 instead of unbounded-on-SQLite /
500-on-PG · `?year=abc` → 400 · `?limit=9999` → 400 · `?indicator=<5KB>` → 400 ·
`question` > 1000 chars → 400 · > 20 history turns → 400.

**Verify:** a table-driven test asserting 400 + a specific message per bad input, mocking
`@/lib/db/queries` and asserting it is **never called** on invalid input. That is the real guarantee.

**Risk:** the `indicatorId` regex rejects anything outside snake_case — verify against all 123
registry ids first, then add a test asserting it, so the constraint cannot silently break future
indicators.

### Step 2.3 — Stop leaking internals — **S, 20 min**

`pg` errors carry hostname, port, database name and sometimes the user; `node:sqlite` errors
carry absolute file paths. Replace `err.message` responses with a generic message and
`console.error` the real one server-side. No UI reads `error` from these routes —
`chat-interface.tsx` shows `json.answer`.

### Step 2.4 — Security headers — `next.config.ts` — **S, 30 min**

```ts
const csp = [
  "default-src 'self'",
  // Next injects inline bootstrap scripts; a strict nonces policy needs middleware.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // tighten after 2.5
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:", "font-src 'self' data:",
  "connect-src 'self'",                                // all AI calls are server-side
  "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      ],
    }];
  },
};
```
> **Do not add `preload` to HSTS** until you control the registrable domain — you can lock
> yourself out.

**This is the single most likely item in the plan to cause a regression.** The E2E suite asserts
**zero console errors** on every page, so a CSP that blocks Recharts, the `world-110m.json`
fetch, or a Google font fails all 8 specs. Verify with `npm run e2e` in the same PR.

### Step 2.5 — Add `middleware.ts` (enabler) — **M, 1.5 h**

```ts
// src/middleware.ts — edge runtime: no Node-only imports (no pg, no node:sqlite)
export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api/ai/")) return NextResponse.next();
  if (Number(req.headers.get("content-length") ?? "0") > 32_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  return NextResponse.next();
}
export const config = { matcher: "/api/ai/:path*" };
```

---

## 4. Wave 3 — Hygiene, config drift, dead code

### Step 3.1 — One `PEER_COUNTRIES` constant — **S, 45 min**

Six hardcoded copies, at these exact locations:

| # | File:line | Symbol |
|---|---|---|
| 1 | `src/app/page.tsx:23-29` | `COMPARISON_COUNTRIES` |
| 2 | `src/app/indicator/[id]/page.tsx:14` | `COMPARE_COUNTRIES` |
| 3 | `src/components/dashboard/comparison-tool.tsx:28` | `DEFAULT_COUNTRIES` |
| 4 | `src/app/report-card/page.tsx:12` | `const PEER = "CHN"` (**not** `src/lib/report-card.ts`) |
| 5 | `src/app/api/ai/chat/route.ts:115` | SQL literal `IN ('IND','USA','CHN','BRA','ZAF')` |
| 6 | `src/app/api/ai/chat/route.ts:150-153` | `isoMap` (10 entries) |

```ts
// src/lib/peer-countries.ts — pure, no DB ⇒ unit-testable
export const PEER_COUNTRIES = ["IND", "USA", "CHN", "BRA", "ZAF"] as const;
export const PEER_COUNTRY_NAMES: Record<string, string> = {
  IND: "India", USA: "USA", CHN: "China", BRA: "Brazil", ZAF: "S. Africa",
};
export const CHAT_COUNTRY_ALIASES: Record<string, string> = {
  usa: "USA", china: "CHN", brazil: "BRA", "south africa": "ZAF",
  japan: "JPN", germany: "DEU", france: "FRA", uk: "GBR", russia: "RUS", india: "IND",
};
```
For `chat/route.ts:115` you **cannot** inline a TS array into SQL — build placeholders so the
existing `pgSql()` `?`→`$N` rewriting keeps working, and keep param order aligned with the `?` sequence:
```ts
const peerPlaceholders = PEER_COUNTRIES.map(() => "?").join(", ");
// …AND country_iso3 IN (${peerPlaceholders})  with params [...PEER_COUNTRIES, ind.id]
```
For `:147-153`, replace the regex alternation with a longest-first `RegExp` built from
`Object.keys(CHAT_COUNTRY_ALIASES)` so `"south africa"` beats prefix collisions.

**Risk:** low, except `chat/route.ts:115` — **wrong param order silently returns the wrong
countries.** Add `src/lib/peer-countries.test.ts`, then grep for the literal → 0 hits.

### Step 3.2 — Unify the flat-trend threshold — `src/lib/trend.ts` — **M, 1 h** — needs §7.2

Three call sites, two values, and three *different return shapes* — which is why nobody factored
it out. Extract the arithmetic, keep each site's presentation:

```ts
// src/lib/trend.ts — pure, no DB ⇒ unit-testable
export const TREND_FLAT_PCT = 0.5;
export function pctChange(current: number|null, previous: number|null): number|null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
export function rawTrend(current: number|null, previous: number|null, higherBetter: boolean) {
  const pct = pctChange(current, previous);
  if (pct == null) return null;
  return { pct, flat: Math.abs(pct) < TREND_FLAT_PCT, improving: higherBetter ? pct >= 0 : pct < 0 };
}
```
Then each call site maps `flat` to its own presentation: `page.tsx:114-122` → `"~0%"`,
`country/[iso3]/page.tsx:38-45` → `{icon: Minus, label: "Stable"}`,
`report-card/page.tsx:14-21` → same.

**E2E is safe.** `e2e/helpers/db.ts:71-107 computeExpectedTrend` mirrors
`indicator/[id]/page.tsx:51-59`, which has **no flat branch**, so flows 4b/4c don't depend on the
threshold. **One real leak:** `report-card/page.tsx:226` puts `trendLabel` in the CSV export.

### Step 3.3 — Unify the percentile formula — `src/lib/score.ts` — **S, 45 min** — needs §7.3

Per 0.3-d, **`rankings.ts` is the outlier** — `/methodology:24` already documents the
`report-card.ts` formula verbatim.

```ts
// src/lib/score.ts
/** Percentile-style score from a 1-based rank: rank 1 → 100, last → 100/total.
 *  Identical to `100 × (1 − (rank − 1) / total)`, the formula documented on /methodology.
 *  One function so /rankings and /report-card can never disagree. */
export function percentileScore(rank: number, total: number): number {
  if (!Number.isFinite(rank) || !Number.isFinite(total) || total <= 1) return 50;
  return ((total - rank + 1) / total) * 100;
}
```
`src/lib/report-card.ts:9-12` → `export { percentileScore as indicatorScore } from "./score";`
(**re-export, don't re-implement** — keeps `country/[iso3]/page.tsx:7,99,123` and
`report-card/page.tsx:9,71,76` working with zero edits).
`src/lib/rankings.ts:37` → `const percentile = percentileScore(rank, total);` and keep the 1-dp
round at `:44` (a display choice, not a formula choice).

**`src/lib/rankings.test.ts` MUST change:** `:32` `expect(ranks[3].percentile).toBe(0)` →
`toBe(25)` (4 rows, rank 4 ⇒ `((4−4+1)/4)×100`). Unaffected: `:31`, `:33`, `:14-19`, `:44-64`.
`report-card.test.ts` **stays green** — that formula does not change.
Add a cross-module guard: `percentileScore(r,t)` agrees with `computeRankings()[i].percentile` to 1 dp.

**Do not "fix" the category-vs-indicator aggregation mismatch:** `/report-card:113` averages
*category* scores (equal category weight) while `/rankings` shows a *per-indicator* percentile.
Different aggregations, not supposed to match.

### Step 3.4 — DRY the home-page formatters — **S, 30 min** — needs §7.4

Per 0.3-e this is a **formatting decision, not a cleanup** — the functions are not equivalent.
Once decided, convert **only** `fmtBig`/`fmtPlain`. The 9 KPI cards that hand-roll formats
(`hdi.toFixed(3)`, `internet.toFixed(0)%`) must **stay inline**: `fmtValue` cannot express them
because it appends a space before the unit, which `format.test.ts:37,42` assert deliberately.
Take a side-by-side screenshot of the KPI grid before/after.

### Step 3.5 — Fix the `sources` registry — **S, 30 min** (fixes N4)

Add `owid`, `wgi`, `unhcr` (10 indicators point at them); remove the orphans `ei` and `itu`.
Net 33 − 2 + 3 = **34**. Note `type: "csv"` — `Source["type"]` already allows
`api | csv | pdf | scrape`, so this also starts making the union honest.

Then add a **failing-loud guard** in `seedStatic()` so this can never drift again:
```ts
const orphans = await query<{ source: string }>(
  `SELECT DISTINCT i.source FROM indicators i
     LEFT JOIN sources s ON s.id = i.source WHERE s.id IS NULL`,
);
if (orphans.length) throw new Error(
  `Indicators reference ${orphans.length} source id(s) with no SOURCES[] row: ` +
  orphans.map(r => r.source).join(", ") + `. Add them to SOURCES[] in scripts/ingest.ts.`,
);
```

### Step 3.6 — Make every documented count true — **S/M, 1.5 h** (depends on 3.5)

| File:line | Currently | → |
|---|---|---|
| `README.md:3-6` | 120 registered, 100 with data | 123 / 117 |
| `README.md:18,19,76,95,96,144,168` | 34 sources, 120 indicators, ~105,740 / ~105k points | 34 / 123 / 252,834 |
| `README.md:170-181` | per-category counts sum to 120 | recompute |
| `README.md:183-184` | "100 of the 120 … the 20 zero-point" | 117 of 123 … the 6 |
| `README.md:211` | "Zustand / TanStack Query — ready when we need…" | drop (neither installed) |
| `AGENTS.md:16,51,65` | 120 / 100 / 105,740 / 34 | 123 / 117 / 252,834 / 34 |
| `AGENTS.md:52,80` | commit `1b29d85` | **`b714455`** |
| `AGENTS.md:83` | "20 indicators at 0 pts" | 6 total; 5 no fetcher; **`epi` has one** |
| `src/app/layout.tsx:19` | "80+ global indicators" | "120+" (a conservative floor) |
| `src/app/methodology/page.tsx:24` | "118+ indicators, 250k+ points" | "123 indicators, 252k+" |
| `src/app/methodology/page.tsx:26` | "25+ such indicators" | **35** |
| `PROJECT_CONTEXT.md:16.5` | "~68 guides … ~55 fall back" | **41 guides … 82 fall back** |
| `PROJECT_CONTEXT.md` §6.6 / §9.1 / §16.3 #20 | "37 ids" | **35** |
| `PROJECT_CONTEXT.md` §5 / §12.1 / §13.3 | "dead Supabase host (ENOTFOUND)" | replace with the 0.3-g finding |
| `PROJECT_CONTEXT.md` §17.2 #39 | zero-point "in /explore and Rankings" | only `/explore` |
| `PROJECT_CONTEXT.md` §5 | "dev-server.log … gitignored" | it is **committed** |

**The durable fix — stop hand-maintaining numbers.** `/methodology` already fetches
`getDashboardStats()` and `getIndicatorCoverage()` and renders live badges (`:20-21`), so
interpolate those instead of hardcoding prose. Export the count so "35" is computed:
```ts
// src/lib/rank-direction.ts
export function lowerIsBetterCount(): number { return LOWER_IS_BETTER.size; }
```
`layout.tsx:19` is static `metadata` with no DB access, so its number must stay literal — set it
to `"120+"` so it can never go stale downward.

### Step 3.7 — Delete 5 dead deps and debris — **S, 30 min**

```bash
npm uninstall drizzle-orm drizzle-kit zustand papaparse d3-scale \
              @types/better-sqlite3 @types/papaparse
```
**Keep `zod`** (it is the Wave 2 fix). **Keep `world-atlas`** if you want to be able to regenerate
`public/world-110m.json`. Since `README.md:211` advertises Zustand as "ready when we need it",
remove the dep **and** delete the README line; add it back when it is used.

Also: `scripts/check-remaining.{cjs,js}` (done in 1.6) · `public/{next,vercel,globe,file,window}.svg`
(git grep → 0 hits; only `favicon.svg` is used) · `git rm --cached dev-server.log` and add it to
`.gitignore` · `src/lib/ai/embeddings.ts` (only after §7.6).

Leave alone: `shadcn` (a CLI masquerading as a runtime dep) and `xlsx@^0.18.5` (genuinely used,
32 refs, known advisory).

### Step 3.8 — `data_points.rank` — **S, 30 min of code — needs §7.9**

| Option | Effort | Risk |
|---|---|---|
| **A. Leave it, add a comment** ✅ | 5 min | none. One nullable INTEGER ≈ 1 MB over 252k rows. |
| B. Hand-run `ALTER TABLE … DROP COLUMN rank` on every DB | 30 min | medium — no migration framework, so `runSqliteMigrations`/`runPgMigrations` cannot express it |
| C. Build a real migration framework | 4–8 h | high, out of scope |

**Recommended: A now.** Add
`// unused: precomputed ranks were replaced by window functions in getLatestRanks()`
to both DDLs (`client.ts:136`, `:197`) and spend the effort on C instead if schema changes are
likely to recur. If you pick B, add a `schema_version` table and a `MIGRATIONS` array first.

### Step 3.9 — Fix the lint baseline — **M, 1.5 h** (needed for the DoD)

`npx eslint . --fix` clears the 3 auto-fixable ones. Then by hand:

- **`src/lib/db/client.ts:14,15,27,108`** — type `_sqLite`/`_pgPool`/`getDb`/`runSqliteMigrations`
  properly. `import type { DatabaseSync } from "node:sqlite"` and `import type { Pool } from "pg"`
  (both type-only, zero runtime cost). **Highest-value fix** — `any` on the DB layer is exactly
  why the N8 recursion hazard was invisible.
- `src/app/api/ai/insights/route.ts:65` — removed by step 1.9.
- `src/app/api/ai/chat/route.ts:215` — `(msg: any)` → `z.infer<typeof chatBody>["conversationHistory"][number]`.
- `src/components/dashboard/world-map-card.tsx:139,150` — `react-hooks/immutability`.
  **Read it before touching; if it is a real mutation bug, this is a find, not a chore.**
- `src/lib/data/sources/sdg.ts:66,73` — narrow the `xlsx` `any`s.
- `src/lib/data/sources/owid-generic.ts:161` — rename/delete `_year`.
- Remaining `no-explicit-any` in `chat-interface.tsx`, `export-buttons.tsx`,
  `indicator-trend-dialog.tsx:33` — narrow, or add a one-line disable **with a reason**.

Write a warning ceiling into `AGENTS.md` so warnings cannot creep.

---

## 5. Wave 4 — Quality of life / partial features (product decision first)

### 4.1 Dark mode: wire it up — **M, 2 h** — §7.3a

The CSS is **finished**: `@custom-variant dark (&:is(.dark *))` (`globals.css:5`), a full `.dark`
OKLCH token block (`:86`), and **25 `dark:` utilities across 16 files**. Two things are missing:

```tsx
// src/components/theme-provider.tsx
"use client";
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
```
```tsx
// src/components/theme-toggle.tsx — guard SSR/CSR mismatch
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <div className="h-9 w-9" aria-hidden />;
```
`suppressHydrationWarning` on `<html>` (`layout.tsx:29`) is **required** with `next-themes`.
Render `<ThemeToggle />` in `site-nav.tsx`'s desktop row **and** its mobile dropdown.

**Recommend wiring over removing:** removing means deleting `@custom-variant dark`, `.dark {}`,
25 classes and the dep — strictly more work, and it discards finished output.

**Risk:** hydration is the classic failure here, and the E2E zero-console-error assertion is the
gate. Verify all 9 pages in both themes.

### 4.2 Mount `<Toaster/>` — **S, 20 min** — §7.3b

One line in `layout.tsx`. But `ui/sonner.tsx:3` calls `useTheme()`, so this **depends on 4.1**.
And it is only useful if something calls `toast()` — otherwise it is invisible code. Wire one real
call site, e.g. `comparison-tool.tsx:184-200 loadInsight` → `toast.success(...)` / `toast.error(...)`.

### 4.3 Delete or surface `/api/ai/insights` — **S/M, 1 h** — §7.5

**Delete** → drop `groq-sdk` too (its only call site was `:5`), update README/AGENTS to list only
`/api/ai/chat`. Saves a dependency, a code path, and a rate-limit bucket.
**Or surface** → an "Analyse this country" button on `/country/[iso3]`; `generateInsight()`
(`src/lib/ai/client.ts:55`) already exists for exactly this and has **0 call sites**. That would
give `/country/USA` real value (today it is India-vs-India radar plus panels).
**Recommendation: delete unless you want the feature.**

### 4.4 Fill in the 82 missing indicator guides — **XL, days** (content, not engineering)

**41 guides for 123 ids → 82 indicators (67%) render the generic fallback.** The unguided set
includes `gdp_current_usd`, `hdi`, `ihdi`, `life_expectancy`, `infant_mortality`,
`maternal_mortality`, `internet_penetration`, `gini`, `literacy_rate`, `poverty_215` — i.e. **almost
every headline indicator is unguided.** 20 guides would cover most user interest.

Add a **ratcheting** test so it can only improve:
```ts
// src/lib/indicator-guides.test.ts
it("headline indicators have curated guides", () => {
  const missing = INDICATORS.filter(i => !GUIDES[i.id]).map(i => i.id);
  expect(missing.length).toBeLessThanOrEqual(TODO_COUNT);   // lower TODO_COUNT each PR
});
```

### 4.5 The 6 zero-point indicators — **M, 1 h diagnostic, then variable** — §7.10

Split by cause **before** spending effort:

| Indicator | Cause | Action |
|---|---|---|
| **`epi`** | **Fetcher exists and is wired** (`indices.ts:263-284`, `ingest.ts:506`, `ingest-new.ts:107`) but yields 0 rows | **Bug hunt.** Suspects: rotated URL, `header.indexOf("EPI.new") === -1` (silent no-op at `:272`), `resolveIso3` miss, hardcoded `year: 2024` at `:284`. **Best chance of a cheap recovery.** |
| `broadband_speed` | no fetcher | needs tile processing or a paid API |
| `ccpi` | no fetcher, PDF-only | ~a day of PDF parsing |
| `digital_competitiveness` | no fetcher, paid | not free |
| `qs_rank` | no fetcher, no open CSV/API | not obtainable |
| `startup_ecosystem` | no fetcher | check for an undocumented API |

**5-minute diagnostic first:**
```powershell
npx tsx -e "import {fetchEpi} from './src/lib/data/sources/indices.ts'; const p = await fetchEpi(); console.log(p.length, p.slice(0,3));"
```

### 4.6 `HF_API_KEY` honesty — **S, 30 min** — §7.6

Delete `src/lib/ai/embeddings.ts` + its re-export from `ai/index.ts:3`, and remove `HF_API_KEY`
from `.env.example:7` and `AGENTS.md:13` — both advertise it as enabling "RAG embeddings", which
is false. **Defer** the `embedding` → `tfidf_vector` column rename: it is a breaking DDL change on
a production DB with no migration framework.

### 4.7 `next dev` warning suppression — **S, 5 min**

Folded into step 1.8.

---

## 6. Prioritised summary

| Wave | Step | Item | Sev | Effort | Dep | Needs a decision? |
|---|---|---|---|---|---|---|
| **0** | 0.1 | Diagnose the real prod DB failure | **BLOCKER** | 0.5 h | — | **YES** §7.7 |
| 0 | 0.2 | Provision + seed a working prod DB | **BLOCKER** | 1–4 h | 0.1 | **YES** §7.7 |
| 0 | 0.3 | DB connect timeouts + typed failure | High | 1 h | — | no |
| 0 | 0.4 | CI gate | Med | 1 h | 3.9 | no |
| **1** | 1.1 | `/chat` mis-attributed citations (N1/N2) | **High** | 0.5 h | — | no |
| 1 | 1.2 | TF-IDF stratifies (23 → 117 indicators) | **High** | 2 h | 0.2 | no |
| 1 | 1.3 | "World rank of India" card | **High** | 0.3 h | — | **YES** §7.1 |
| 1 | 1.4 | `/country/IND` degenerate radar | **High** | 0.5 h | — | **YES** §7.1 |
| 1 | 1.5 | `ingest:wb` honours argv | Med | 1 h | — | no |
| 1 | 1.6 | Delete the broken migration stub | Med | 0.25 h | — | no |
| 1 | 1.7 | Playwright self-starts | Med | 0.5 h | — | no |
| 1 | 1.8 | POSIX-safe scripts | Med | 0.3 h | — | no |
| 1 | 1.9 | `/api/ai/insights` no longer explodes | Med | 0.3 h | — | **YES** §7.5 |
| **2** | 2.1 | Rate-limit the AI routes | **High** | 2 h | — | **YES** §7.8 |
| 2 | 2.2 | Real input validation (`zod`) | High | 2 h | — | no |
| 2 | 2.3 | Stop leaking `err.message` | High | 0.3 h | — | no |
| 2 | 2.4 | Security headers | High | 0.5 h | — | no |
| 2 | 2.5 | `middleware.ts` | Med | 1.5 h | 2.4 | no |
| **3** | 3.1 | One `PEER_COUNTRIES` | Med | 0.75 h | — | no |
| 3 | 3.2 | Unify flat-trend threshold | Med | 1 h | — | **YES** §7.2 |
| 3 | 3.3 | Unify percentile formula | Med | 0.75 h | — | **YES** §7.3 |
| 3 | 3.4 | DRY home-page formatters | Low | 0.5 h | — | **YES** §7.4 |
| 3 | 3.5 | Fix the `sources` registry (N4) | Med | 0.5 h | — | no |
| 3 | 3.6 | Make every documented count true | Med | 1.5 h | 3.5 | no |
| 3 | 3.7 | Delete 5 dead deps + debris | Low | 0.5 h | 4.3 | partial §7.6 |
| 3 | 3.8 | `data_points.rank` | Low | 0.5 h | — | **YES** §7.9 |
| 3 | 3.9 | Fix the lint baseline | Med | 1.5 h | — | no |
| **4** | 4.1 | Wire dark mode | Med | 2 h | — | **YES** §7.3a |
| 4 | 2 | Mount `<Toaster/>` | Low | 0.3 h | 4.1 | **YES** §7.3b |
| 4 | 4.3 | Delete or surface `/api/ai/insights` | Med | 1 h | 1.9 | **YES** §7.5 |
| 4 | 4.4 | 82 missing indicator guides | **XL** | days | — | no (content) |
| 4 | 4.5 | 6 zero-point indicators | Med | 1 h+ | — | **YES** §7.10 |
| 4 | 4.6 | `HF_API_KEY` honesty | Low | 0.5 h | — | **YES** §7.6 |

**Total engineering ≈ 28 h**, excluding 4.4 (content) and 0.2 (infra waiting).

---

## 7. Ambiguous — these need your decision, not a code change

### 7.1 The duplicate rank card — delete, or give it a different job?
`indicator/[id]/page.tsx` shows the same fact twice, and the `findIndex` version **has no correct
form**. **Recommend: delete it** — the neighbour already says it. If you want four cards for grid
symmetry, what is the fourth fact worth showing (percentile? score? rank delta?)

### 7.2 Flat-trend threshold — 0.5% or 0.1%?
**Recommend 0.5% everywhere**: two of three sites already use it, a 0.12% move is not meaningfully
"stable", and it matches the 1-decimal display precision. *But* `0.1` makes the report card quieter,
which may be deliberate for a printable grade sheet. This leaks into the CSV export.

### 7.3 Which percentile is canonical?
**Recommend the `report-card.ts` formula everywhere** — `/methodology` already documents it, so
`rankings.ts` is the single outlier. *But* if Rankings is the more "analytical" surface,
`PERCENTRANK.INC` semantics may be right there and `/methodology` may be the thing that is wrong.
**Is `/methodology` the source of truth, or the code?**

### 7.3a/3b Dark mode and toasts — wire up or remove?
- **Dark mode → wire up.** The token layer, the variant, and 25 classes already exist; removing
  is more work and discards finished output.
- **Toasts → mount `<Toaster/>`**, but only if something calls `toast()`. Is there a notification
  you want ("AI insight generated", "CSV downloaded", "data is N days stale")? If not, delete
  `ui/sonner.tsx` and the `sonner` dep instead.
- **Coupling:** `ui/sonner.tsx:3` calls `useTheme()`. Mounting it before 4.1 reads an undefined theme.

### 7.4 Home-page KPI format — keep `$3.85T` or switch to `3.85T US$`?
**Recommend `fmtValue` everywhere** for consistency with the other 6 pages, accepting
`"3.85T US$"` on the GDP card — or keep `$` by passing the symbol separately. Nine of twelve cards
hand-roll formats `fmtValue` cannot express without changing its output and breaking 8 existing
`format.test.ts` assertions. **Is the `$`-prefixed GDP card a deliberate brand choice?**

### 7.5 `/api/ai/insights` — fix, delete, or surface?
**Recommend: delete the route and `groq-sdk`.** 0 callers, a second Groq code path, and pure
attack surface. Fixing it first (1.9) is worth it either way — 20 min, removes a 500.
*Alternative:* surface it. `generateInsight()` already exists and has 0 call sites; an "Analyse
this country" button would give `/country/USA` real value. **Delete, or build the UI?**

### 7.6 HuggingFace embeddings — keep or remove?
**Recommend remove** the module and the env var so `.env.example` stops lying.
*Alternative:* actually implement dense retrieval — but that is a **feature** (real embedding
model, vector column, ANN index, and a decision about whether it beats TF-IDF at this scale).
**Is semantic retrieval on the roadmap for this challenge?**

### 7.7 Production database — what, exactly?
Run the §0.1 diagnostic first; the "dead host" premise is wrong. Then, if the project really is
gone:
- **Supabase** — matches all existing docs; direct connections are IPv6-only for new projects,
  a latent trap on any IPv4-only host.
- **Neon** — free tier, IPv4-native, serverless driver.
- **Turso/libSQL** — would let local and prod share one engine, eliminating the duplicated
  SQLite/PG DDL and making `data/india.db` a real thing rather than a gitignored artefact.
  Highest effort, best long-term fit.

Also: any chance of moving off Vercel? The ephemeral filesystem is the root reason SQLite cannot
work in production. And **export a dump of any DB you still have before re-seeding** — several
sources are discontinued and unsnapshotted, so the dataset is not reproducible.

### 7.8 Rate limiting — which mechanism, what spend cap?
- **Upstash Redis + `@upstash/ratelimit`** — accurate across lambdas, free account, 2 env vars.
- **Vercel platform limits / WAF** — no code, but coarse; needs a paid plan for useful limits.
- **In-memory `Map`** — zero deps, but dies with every lambda, so an attacker gets a fresh budget
  per cold start. Dev fallback only.
- **Independently: set a hard cap in the Groq console.** Without one, a limiter bypassable by
  rotating IPs is not a financial control. Is there a budget for the free-tier AI calls, and would
  you rather disable `/api/ai/*` entirely in production than expose it?

### 7.9 `data_points.rank` — drop or leave?
**Recommend leave it** and add a comment. Dropping needs hand-written `ALTER TABLE … DROP COLUMN`
on every database (SQLite *and* production PG) because there is no migration framework, and it
silently breaks anything outside this repo that reads it. **Does anything outside this codebase
read `data_points.rank`?**

### 7.10 The 6 zero-point indicators — hide, label, or build fetchers?
- **(a) Hide everywhere.** Cheapest, honest — but "123 indicators" becomes 117.
- **(b) Keep visible with a "No data yet — source unavailable" badge.** Preserves the 123 headline
  and is maximally honest. ~1 h: `explore/page.tsx` already receives `getIndicatorCoverage()`
  output including `dataPoints`, so the client can render a badge from data it already has.
- **(c) Build the fetchers.** `epi` is a genuine bug hunt; `ccpi` needs PDF parsing; `broadband`
  needs tiles or a paid API; the other three have no free source.

**Recommend (b) now + (c) for `epi` only.** For a data dashboard, is it better to advertise 123
and badge 6, or advertise 117 and hide them?

---

## 8. Things I could NOT verify — treat as assumptions

| # | Assumption | How to resolve |
|---|---|---|
| 1 | Vercel env vars contain a stale `DATABASE_URL` | `npx vercel env ls production` |
| 2 | Production is returning 500 **right now** | no domain is recorded anywhere in the repo; `npx vercel logs` |
| 3 | The old Supabase project is unrecoverable | DNS resolves (AAAA only); TCP failed locally only because this machine has no IPv6 route. Test from Vercel. |
| 4 | Groq quota is being burned | no analytics to measure against — check the Groq console |
| 5 | `data/india.db` is reproducible by re-running `npm run ingest` | I read the fetchers but did not execute them; several sources are discontinued. **Do not destroy your existing DB — snapshot it.** |
| 6 | Only `epi` among the 6 zero-point indicators has a fetcher | a fetcher resolving ids dynamically would not match a literal grep |
| 7 | `npm run build` passes | not run (slow, may prerender pages that hit the DB) — establish in Wave 0 |
| 8 | The E2E suite passes today on a live server | needs a dev server on :3456 + a Chromium download; not run |
| 9 | `npm test`'s "exited with code 1" is a PowerShell stderr artifact | Vitest reported 51/51 before the wrapper errored on a Vite-config warning — re-run under `cmd` |
| 10 | §16's 22 findings are the complete set | demonstrably not — 9 more found. Assume more exist. |
| 11 | `LOWER_IS_BETTER` has 35 ids and `GUIDES` has 41 entries | parsed with regexes; settle with `console.log(LOWER_IS_BETTER.size, Object.keys(GUIDES).length)` |

---

## 9. Definition of done

### 9.1 Automated gates — all five must pass

```powershell
npm ci
npm run lint       # MUST be 0 errors. Baseline today: 21 errors / 24 warnings.
npx tsc --noEmit   # passes today; must stay green
npm test           # ≥ 51 tests, 7 files. Add tests for every new behaviour.
npm run build      # MUST pass. Untested baseline — establish in Wave 0.
npm run e2e        # 8 specs green against a server Playwright starts itself.
```
Plus, on the **live database**:
```sql
SELECT COUNT(DISTINCT indicator_id) FROM embeddings;   -- 117 (was 23)
SELECT COUNT(*) FROM data_points;                      -- 252,834
SELECT COUNT(*) FROM indicators;                       -- 123
SELECT COUNT(*) FROM sources;                          -- 34 (was 33)
SELECT COUNT(*) FROM indicators i
 WHERE NOT EXISTS (SELECT 1 FROM data_points d WHERE d.indicator_id = i.id);  -- 6
```

### 9.2 Manual checks — required, not optional

| # | Check | Passes when |
|---|---|---|
| 1 | All 9 routes on the deployed URL | 200, no "Application error", no `digest:` |
| 2 | **Prod DB failure is fast and typed** | break `DATABASE_URL`, reload `/` → fails in **<10s** with a named cause, not a 60s hang |
| 3 | `/indicator/<id>` shows **one** rank figure, agreeing with `/rankings?indicator=<id>` | use `gini` (India ≈ #130) — the old card could never exceed 10 |
| 4 | `/country/IND` radar shows **two visibly different** series; `/country/USA` unchanged | no overlapping lines, no duplicate legend entry |
| 5 | `/chat` answers "What is India's HDI?" and "…Gini coefficient?" **with citations** | both previously unanswerable |
| 6 | **Citation integrity** — for 3 questions every `citations[].id` resolves to a real `embeddings.id` whose `chunk_text` matches the number quoted | the N1 regression test |
| 7 | Rate limit: 11th request to `/api/ai/chat` | 429 + `Retry-After`, not 500 |
| 8 | Validation: `?limit=-1`, `?year=abc`, 5 KB `?indicator`, >1000-char `question` | all 400; **DB never queried** |
| 9 | No internal leakage: force a DB error, inspect the body | no hostname, no path, no SQL |
| 10 | Security headers via `curl -sI $DEPLOY/` | CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` |
| 11 | **Full E2E green after the CSP change** | the regression gate for 2.4 |
| 12 | `npm run ingest:wb` | only World Bank lines; `npm run ingest` unchanged |
| 13 | `npm run ingest:wb bogus` | exits non-zero with the unknown-source message |
| 14 | Warning suppression on **bash, cmd, PowerShell** | 0 `ExperimentalWarning` lines |
| 15 | Dark mode on all 9 pages, both themes | readable; no hydration warnings |
| 16 | Report-card CSV still opens in Excel | BOM intact; `trendLabel` sensible after the threshold change |
| 17 | Print / Save-as-PDF on `/report-card` | `ExportButtons` is `print:hidden`; no chart clipped |
| 18 | Home-page footer source list | lists OWID, WGI, UNHCR; count matches the `sources` table |
| 19 | Every number in README/AGENTS/layout/methodology | matches `npm run status`; zero stale counts |

### 9.3 Done means done only if

- [ ] Production serves 200 on all 9 routes from a **reachable, migrated** database — and we know
      *why* it was broken, not just that it works now.
- [ ] `npm run lint` exits 0.
- [ ] All five automated gates pass on a clean `npm ci`.
- [ ] `embeddings` covers all 117 data-bearing indicators.
- [ ] `/chat` cites only real, correctly-attributed data points.
- [ ] **No number on any page contradicts another number on the same page.**
- [ ] `/api/ai/*` is rate-limited, validated, and does not leak internals.
- [ ] Every documented count is true, and **no documented count can drift again.**
- [ ] No dead dependency, dead file, or dead column without a written reason for existing.
- [ ] `AGENTS.md` accurately describes the repo — it is the file future agents trust.

---

## 10. Blast radius — shared pure logic and existing tests

### `src/lib/rankings.ts` — `computeRankings` · `computeRankHistory` · `rankDelta`
**Tested by** `src/lib/rankings.test.ts` (65 lines). **Touched by** step 3.3 only.

```
:32  expect(ranks[3].percentile).toBe(0)  →  toBe(25)   // 4 rows, rank 4 ⇒ ((4-4+1)/4)×100
```
Unaffected: `:31` (rank 1 ⇒ 100 in both), `:33` (tie equality), `:14-19`, `:44-50`, `:53-64`.

**Blast radius:** imported by `src/app/api/rankings/route.ts:3` → `/rankings` → `RankingsClient`.
**Nothing else imports it.** Pure, no DB, no SQL, no caching.
**Behaviour change:** every percentile on `/rankings` shifts ≤1pp (rank 100 of 217: 54.2 → 54.4).
The India percentile card is user-visible. **No E2E asserts a percentile value.**

### `src/lib/report-card.ts` — `indicatorScore` · `average` · `gradeFor` · `prevValueInSeries`
**Tested by** `src/lib/report-card.test.ts` (68 lines). **Touched by** step 3.3 (re-export only).
**Test impact: NONE** — the formula is unchanged; `:7` `expect(indicatorScore(100,100)).toBeCloseTo(1)`
stays green because `((100−100+1)/100)×100 = 1`. ✔

**Widest blast radius of the four modules.** Imported by `country/[iso3]/page.tsx:7` (used at `:99`,
`:123-124`, `:134`, `:133`) and `report-card/page.tsx:9` (`:71`, `:76`, `:102-103`, `:113`, `:124`).
**Behaviour-preserving for both pages** — their numbers do not move. Only `/rankings` changes.

### `src/lib/rank-direction.ts` — `isHigherBetter` · `LOWER_IS_BETTER` (35 ids)
**Tested by: no dedicated test file.** Imported by `e2e/helpers/db.ts:3` and used by flows 4b/4c.

**Widest blast radius in the codebase, and the change is additive-only.** `isHigherBetter()` drives
`queries.ts:95-99` (`getLatestRanks` ORDER BY — **changes SQL result order**), `:129-138`
(`getLeaderboard` ORDER BY), `leaderboard:14`, `rankings:22`, `comparison-tool:164,401`,
`indicator/[id]:32,43,74-75,213`, `report-card-sections`.

> **Do not add or remove ids.** Flipping one silently reorders every leaderboard and flips every
> trend colour on that indicator.

**Recommended:** add `src/lib/rank-direction.test.ts` asserting (a) `LOWER_IS_BETTER.size === 35`,
(b) every id is a real registry id, (c) `isHigherBetter` inverts correctly. Right now a typo in
one of the 35 strings is invisible — it would quietly mark that indicator higher-is-better.

### `src/lib/format.ts` — `fmtValue` · `fmtCompact`
**Tested by** `src/lib/format.test.ts` (8 cases). **Touched by** step 3.4 only if you change its
output — which step 3.4 explicitly says **not** to do. `:37` and `:42` assert the
space-before-unit deliberately.