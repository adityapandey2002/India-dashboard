import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const getLatestSnapshotMock = vi.fn();
const getIndicatorSeriesMock = vi.fn();
const getAllCountriesMock = vi.fn();
const getLeaderboardMock = vi.fn();
const chatMock = vi.fn();

vi.mock("@/lib/db/queries", () => ({
  getLatestSnapshot: (...args: unknown[]) => getLatestSnapshotMock(...args),
  getIndicatorSeries: (...args: unknown[]) => getIndicatorSeriesMock(...args),
  getAllCountries: (...args: unknown[]) => getAllCountriesMock(...args),
  getLeaderboard: (...args: unknown[]) => getLeaderboardMock(...args),
}));

vi.mock("@/lib/ai", () => ({
  chat: (...args: unknown[]) => chatMock(...args),
}));

const { POST } = await import("./route");

const originalKey = process.env.GROQ_API_KEY;

function makePost(body: unknown) {
  return new NextRequest("http://localhost/api/ai/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GROQ_API_KEY = "test-key";
    getLatestSnapshotMock.mockResolvedValue({});
    getIndicatorSeriesMock.mockResolvedValue([]);
    getAllCountriesMock.mockResolvedValue([{ iso3: "IND", name: "India" }]);
    getLeaderboardMock.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
  });

  it("returns 503 when GROQ_API_KEY is not set", async () => {
    delete process.env.GROQ_API_KEY;
    const res = await POST(makePost({ iso3: "IND" }));
    expect(res.status).toBe(503);
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed iso3", async () => {
    const res = await POST(makePost({ iso3: "india" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("3-letter");
    expect(getLatestSnapshotMock).not.toHaveBeenCalled();
  });

  it("defaults to IND and returns the analysis from chat()", async () => {
    chatMock.mockResolvedValue("India is doing well.");
    const res = await POST(makePost({}));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analysis).toBe("India is doing well.");
    expect(getLatestSnapshotMock).toHaveBeenCalledWith("IND");
    // GDP leaderboard is fetched with higher-is-better explicitly
    expect(getLeaderboardMock).toHaveBeenCalledWith(
      "gdp_current_usd",
      expect.any(Number),
      10,
      true,
    );
    // routed through the shared chat() helper with a tight token budget
    expect(chatMock).toHaveBeenCalledWith(
      [{ role: "user", content: expect.stringContaining("India (IND)") }],
      { maxTokens: 300 },
    );
  });

  it("returns 503 when chat() yields nothing (key set, call failed)", async () => {
    chatMock.mockResolvedValue(null);
    const res = await POST(makePost({ iso3: "USA" }));
    expect(res.status).toBe(503);
  });

  it("returns a generic 500 without leaking internals", async () => {
    getLatestSnapshotMock.mockRejectedValue(new Error("C:\\secret\\path\\india.db"));
    const res = await POST(makePost({ iso3: "IND" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to generate analysis");
    expect(body.error).not.toContain("secret");
  });
});
