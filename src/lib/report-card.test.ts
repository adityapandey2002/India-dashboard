import { describe, it, expect } from "vitest";
import { indicatorScore, average, gradeFor, prevValueInSeries } from "./report-card";

describe("indicatorScore", () => {
  it("gives the best country 100 and the worst a small score", () => {
    expect(indicatorScore(1, 100)).toBe(100);
    expect(indicatorScore(100, 100)).toBeCloseTo(1);
    expect(indicatorScore(2, 100)).toBeCloseTo(99);
  });

  it("returns a neutral 50 for a single-country comparison", () => {
    expect(indicatorScore(1, 1)).toBe(50);
  });

  it("handles non-finite inputs", () => {
    expect(indicatorScore(Number.NaN, 50)).toBe(50);
    expect(indicatorScore(3, Number.POSITIVE_INFINITY)).toBe(50);
  });
});

describe("average", () => {
  it("returns the arithmetic mean", () => {
    expect(average([10, 20, 30])).toBe(20);
    expect(average([100])).toBe(100);
  });

  it("returns null for an empty list", () => {
    expect(average([])).toBeNull();
  });
});

describe("gradeFor", () => {
  it("maps score ranges to letters", () => {
    expect(gradeFor(90).letter).toBe("A");
    expect(gradeFor(85).letter).toBe("A");
    expect(gradeFor(70).letter).toBe("B");
    expect(gradeFor(55).letter).toBe("C");
    expect(gradeFor(40).letter).toBe("D");
    expect(gradeFor(10).letter).toBe("F");
  });
});

describe("prevValueInSeries", () => {
  const series = [
    { year: 2019, value: 10 },
    { year: 2021, value: 20 },
    { year: 2022, value: 30 },
  ];

  it("returns the nearest previous value, skipping gaps", () => {
    expect(prevValueInSeries(series, 2022)).toBe(20);
    expect(prevValueInSeries(series, 2021)).toBe(10);
  });

  it("ignores null values and future years", () => {
    const withNull = [
      { year: 2019, value: 10 },
      { year: 2020, value: null },
      { year: 2021, value: 20 },
    ];
    expect(prevValueInSeries(withNull, 2021)).toBe(10);
  });

  it("returns null when there is no earlier value", () => {
    expect(prevValueInSeries(series, 2019)).toBeNull();
    expect(prevValueInSeries([], 2022)).toBeNull();
  });
});
