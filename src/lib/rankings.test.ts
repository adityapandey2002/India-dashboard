import { describe, it, expect } from "vitest";
import { computeRankings, computeRankHistory, rankDelta } from "./rankings";

describe("computeRankings", () => {
  const rows = [
    { iso3: "USA", value: 100, year: 2020 },
    { iso3: "CHN", value: 80, year: 2020 },
    { iso3: "IND", value: 80, year: 2020 },
    { iso3: "BRA", value: 60, year: 2020 },
  ];

  it("ranks highest value first when higher is better", () => {
    const ranks = computeRankings(rows, true);
    expect(ranks.map((r) => r.iso3)).toEqual(["USA", "CHN", "IND", "BRA"]);
    expect(ranks[0].rank).toBe(1);
    expect(ranks[1].rank).toBe(2); // tie → both get rank 2
    expect(ranks[2].rank).toBe(2);
    expect(ranks[3].rank).toBe(4);
    expect(ranks[0].total).toBe(4);
  });

  it("reverses order when lower is better", () => {
    const ranks = computeRankings(rows, false);
    expect(ranks.map((r) => r.iso3)).toEqual(["BRA", "CHN", "IND", "USA"]);
    expect(ranks[0].rank).toBe(1); // BRA lowest → rank 1
    expect(ranks[3].rank).toBe(4); // USA highest → rank 4
  });

  it("computes percentile with best = 100", () => {
    const ranks = computeRankings(rows, true);
    expect(ranks[0].percentile).toBe(100);
    expect(ranks[3].percentile).toBe(0);
    expect(ranks[1].percentile).toBe(ranks[2].percentile); // ties share percentile
  });
});

describe("computeRankHistory", () => {
  const series = [
    { year: 2010, value: 50 },
    { year: 2011, value: 70 },
    { year: 2012, value: 60 },
  ];

  it("ranks within each year", () => {
    const hist = computeRankHistory(series, true);
    expect(hist).toHaveLength(3);
    expect(hist[0]).toEqual({ year: 2010, rank: 1, total: 1 });
    expect(hist[1].year).toBe(2011);
    expect(hist[2].rank).toBe(1);
  });
});

describe("rankDelta", () => {
  it("returns difference between last two ranks", () => {
    const hist = [
      { year: 2010, rank: 5, total: 100 },
      { year: 2011, rank: 8, total: 100 },
    ];
    expect(rankDelta(hist)).toBe(3);
  });

  it("returns null with fewer than 2 points", () => {
    expect(rankDelta([{ year: 2010, rank: 5, total: 100 }])).toBeNull();
  });
});
