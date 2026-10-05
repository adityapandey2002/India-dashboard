import { describe, it, expect, vi, beforeEach } from "vitest";
import { vectorSearch } from "./vector-search";

const queryMock = vi.fn();

vi.mock("@/lib/db/client", () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

type Row = {
  id: string;
  chunk_text: string;
  source: string;
  indicator_id: string | null;
  country_iso3: string | null;
  year: number | null;
  embedding: string | null;
};

const row = (id: string, terms: Record<string, number>): Row => ({
  id,
  chunk_text: `chunk ${id}`,
  source: `src_${id}`,
  indicator_id: "gdp_current_usd",
  country_iso3: "IND",
  year: 2020,
  embedding: JSON.stringify(terms),
});

const FINGERPRINT = [{ n: 2, mx: "chunk_2" }];
const ROWS = [row("chunk_1", { gdp: 1, india: 1 }), row("chunk_2", { hdi: 1 })];

const isFingerprint = (sql: string) => sql.includes("COUNT(*)") && sql.includes("MAX(id)");

describe("vectorSearch", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockImplementation(async (sql: string) => (isFingerprint(sql) ? FINGERPRINT : ROWS));
  });

  it("parses the embedding index only once across searches", async () => {
    const first = await vectorSearch("gdp india");
    const second = await vectorSearch("hdi");

    expect(first?.[0]?.id).toBe("chunk_1");
    expect(second?.[0]?.id).toBe("chunk_2");

    const indexScans = queryMock.mock.calls.filter(([sql]) => !isFingerprint(sql as string));
    expect(indexScans).toHaveLength(1);
  });

  it("clamps a huge question before tokenizing it", async () => {
    // A 500 KB question must not blow up the scorer, but still returns matches.
    const results = await vectorSearch("gdp ".repeat(100_000));
    expect(results?.length).toBeGreaterThan(0);
    expect(await vectorSearch("!!!")).toBeNull();
  });

  it("returns null when there is no usable index", async () => {
    queryMock.mockImplementation(async (sql: string) => (isFingerprint(sql) ? [{ n: 0, mx: null }] : []));
    expect(await vectorSearch("gdp")).toBeNull();
  });

  it("rebuilds the index when the fingerprint changes (re-ingest)", async () => {
    await vectorSearch("gdp");
    queryMock.mockImplementation(async (sql: string) =>
      isFingerprint(sql) ? [{ n: 3, mx: "chunk_3" }] : [...ROWS, row("chunk_3", { gdp: 1 })],
    );
    const after = await vectorSearch("gdp");
    expect(after?.[0]?.id).toBe("chunk_3");
    expect(queryMock.mock.calls.filter(([sql]) => !isFingerprint(sql as string)).length).toBe(2);
  });
});
