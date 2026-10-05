import { describe, it, expect } from "vitest";
import { computeTrend, FLAT_THRESHOLD_PCT } from "./trend";

describe("computeTrend", () => {
  it("returns null without both values", () => {
    expect(computeTrend(null, 100)).toBeNull();
    expect(computeTrend(100, null)).toBeNull();
    expect(computeTrend(null, null)).toBeNull();
  });

  it("returns null when the previous value is zero (undefined % change)", () => {
    expect(computeTrend(5, 0)).toBeNull();
  });

  it("treats sub-threshold moves as flat", () => {
    const up = computeTrend(100.3, 100);
    expect(up?.direction).toBe("flat");
    expect(up?.pct).toBeCloseTo(0.3, 5);
    const down = computeTrend(99.7, 100);
    expect(down?.direction).toBe("flat");
    expect(down?.pct).toBeCloseTo(-0.3, 5);
  });

  it("flags moves at or above the threshold as up/down", () => {
    // strictly-below comparison: exactly 0.5% is a real move
    expect(computeTrend(100.5, 100)?.direction).toBe("up");
    expect(computeTrend(99.5, 100)?.direction).toBe("down");
    expect(computeTrend(110, 100)?.direction).toBe("up");
    expect(computeTrend(90, 100)?.direction).toBe("down");
  });

  it("handles negative previous values via Math.abs", () => {
    // (-110 - -100) / |-100| * 100 = -10%
    const t = computeTrend(-110, -100);
    expect(t?.direction).toBe("down");
    expect(t?.pct).toBeCloseTo(-10, 5);
  });

  it("uses a 0.5% flat threshold", () => {
    expect(FLAT_THRESHOLD_PCT).toBe(0.5);
  });
});
