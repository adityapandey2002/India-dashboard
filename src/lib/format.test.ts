import { describe, it, expect } from "vitest";
import { fmtCompact, fmtValue, fmtMoney } from "./format";

describe("fmtValue", () => {
  it("renders an em dash for nullish values", () => {
    expect(fmtValue(null)).toBe("—");
    expect(fmtValue(null, "index")).toBe("—");
  });

  it("renders small values without compacting", () => {
    expect(fmtValue(0)).toBe("0");
    expect(fmtValue(0.5)).toBe("0.5");
    expect(fmtValue(42)).toBe("42");
    expect(fmtValue(999)).toBe("999");
    expect(fmtValue(999.99)).toBe("999.99");
  });

  it("compacts at the 1e3 boundary", () => {
    expect(fmtValue(1000)).toBe("1.0k");
    expect(fmtValue(1234.5)).toBe("1.2k");
    expect(fmtValue(999999)).toBe("1000.0k");
  });

  it("compacts millions, billions, trillions", () => {
    expect(fmtValue(1e6)).toBe("1.00M");
    expect(fmtValue(2.5e6)).toBe("2.50M");
    expect(fmtValue(1e9)).toBe("1.00B");
    expect(fmtValue(1e12)).toBe("1.00T");
  });

  it("handles negative values", () => {
    expect(fmtValue(-1.5)).toBe("-1.5");
    expect(fmtValue(-5000)).toBe("-5.0k");
  });

  it("limits percent precision to 1 decimal", () => {
    expect(fmtValue(12.345, "%")).toBe("12.3 %");
    expect(fmtValue(3.14159, "%")).toBe("3.1 %");
  });

  it("appends the unit when provided", () => {
    expect(fmtValue(2500, "kg")).toBe("2.5k kg");
    expect(fmtValue(1.5e6, "US$")).toBe("1.50M US$");
    expect(fmtValue(42, "index")).toBe("42 index");
  });

  it("falls through to raw formatting for NaN", () => {
    expect(fmtValue(NaN)).toBe("NaN");
  });
});

describe("fmtCompact", () => {
  it("renders an em dash for nullish values", () => {
    expect(fmtCompact(null)).toBe("—");
  });

  it("keeps small numbers un-compacted", () => {
    expect(fmtCompact(0)).toBe("0");
    expect(fmtCompact(0.5)).toBe("0.5");
    expect(fmtCompact(999)).toBe("999");
  });

  it("compacts without padding forced decimals", () => {
    expect(fmtCompact(1000)).toBe("1k");
    expect(fmtCompact(1234.5)).toBe("1.23k");
    expect(fmtCompact(1e6)).toBe("1M");
    expect(fmtCompact(1.5e9)).toBe("1.5B");
  });

  it("renders GDP-sized values as trillions", () => {
    expect(fmtCompact(32_000_000_000_000)).toBe("32T");
    expect(fmtCompact(2.345e13)).toBe("23.45T");
  });

  it("handles negative values", () => {
    expect(fmtCompact(-5e9)).toBe("-5B");
    expect(fmtCompact(-1.5e12)).toBe("-1.5T");
  });
});

describe("fmtMoney", () => {
  it("renders an em dash for nullish values", () => {
    expect(fmtMoney(null)).toBe("—");
  });

  it("prefixes $ and keeps 2 decimals at trillions", () => {
    expect(fmtMoney(3.85e12)).toBe("$3.85T");
    expect(fmtMoney(1e12)).toBe("$1.00T");
  });

  it("uses 1 decimal at billions and millions", () => {
    expect(fmtMoney(2.1e9)).toBe("$2.1B");
    expect(fmtMoney(7.5e6)).toBe("$7.5M");
  });

  it("keeps the sign before the symbol", () => {
    expect(fmtMoney(-1.5e12)).toBe("-$1.50T");
  });

  it("does not prefix $ below a million", () => {
    expect(fmtMoney(1234)).toBe("1,234");
    expect(fmtMoney(42.34)).toBe("42.3");
  });
});
