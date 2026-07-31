import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const queryMock = vi.fn();
const getGlobalLatestMock = vi.fn();

vi.mock("@/lib/db/client", () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

vi.mock("@/lib/db/queries", () => ({
  getGlobalLatest: (...args: unknown[]) => getGlobalLatestMock(...args),
}));

const { GET } = await import("./route");

function makeReq(url: string) {
  return new NextRequest(url);
}

describe("GET /api/scatter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when x or y are missing", async () => {
    const res = await GET(makeReq("http://localhost/api/scatter"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("x and y");
  });

  it("joins latest values for both indicators per country and computes Pearson r", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM indicators")) {
        return [
          { id: "gni_per_capita", name: "GNI per capita", unit: "$" },
          { id: "innovation_idx", name: "Innovation Index", unit: "index" },
        ];
      }
      if (sql.includes("FROM countries")) {
        return [
          { iso3: "IND", name: "India" },
          { iso3: "USA", name: "United States" },
          { iso3: "CHN", name: "China" },
        ];
      }
      return [];
    });

    getGlobalLatestMock.mockImplementation(async (id: string) => {
      if (id === "gni_per_capita") {
        return [
          { iso3: "IND", value: 2500, year: 2023 },
          { iso3: "USA", value: 80000, year: 2023 },
          { iso3: "CHN", value: 12000, year: 2022 },
        ];
      }
      return [
        { iso3: "IND", value: 40, year: 2023 },
        { iso3: "USA", value: 60, year: 2023 },
        { iso3: "CHN", value: 55, year: 2022 },
      ];
    });

    const res = await GET(makeReq("http://localhost/api/scatter?x=gni_per_capita&y=innovation_idx"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.x.name).toBe("GNI per capita");
    expect(body.y.name).toBe("Innovation Index");
    expect(body.points).toHaveLength(3);
    expect(body.india).toMatchObject({ iso3: "IND", name: "India", x: 2500, y: 40, xYear: 2023, yYear: 2023 });

    const usa = body.points.find((p: { iso3: string }) => p.iso3 === "USA");
    expect(usa).toMatchObject({ x: 80000, y: 60 });

    expect(body.correlation).toBeGreaterThan(0);
    expect(body.correlation).toBeLessThanOrEqual(1);
  });

  it("returns correlation null with fewer than 3 points", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM indicators")) {
        return [{ id: "a", name: "A", unit: null }, { id: "b", name: "B", unit: null }];
      }
      return [{ iso3: "IND", name: "India" }];
    });

    getGlobalLatestMock.mockImplementation(async (id: string) => {
      return [
        { iso3: "IND", value: id === "a" ? 1 : 2, year: 2023 },
      ];
    });

    const res = await GET(makeReq("http://localhost/api/scatter?x=a&y=b"));
    const body = await res.json();
    expect(body.points).toHaveLength(1);
    expect(body.correlation).toBeNull();
    expect(body.india).not.toBeNull();
  });
});
