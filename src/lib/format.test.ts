import { describe, it, expect } from "vitest";
import { fmtValue } from "./format";

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
