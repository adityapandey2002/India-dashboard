import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { chatDetailed, chatFailureMessage, resolveModel, __clearModelCache } from "./client";

const fetchMock = vi.fn();

function modelsResponse(ids: Array<string | { id: string; active?: boolean }>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data: ids.map((i) => (typeof i === "string" ? { id: i } : i)),
    }),
    text: async () => "",
  };
}

function chatResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const COMPLETION = { choices: [{ message: { content: "India's GDP is 3.4T" } }] };

describe("groq client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    __clearModelCache();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("GROQ_API_KEY", "gsk_test_key");
    // stubEnv (not a raw delete) so unstubAllEnvs restores any real override.
    vi.stubEnv("GROQ_MODEL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns the answer text on success", async () => {
    fetchMock.mockResolvedValueOnce(modelsResponse(["qwen/qwen3.8-27b"]))
      .mockResolvedValueOnce(chatResponse(COMPLETION));
    const result = await chatDetailed([{ role: "user", content: "hi" }]);
    expect(result).toEqual({ ok: true, text: "India's GDP is 3.4T", model: "qwen/qwen3.8-27b" });
  });

  it("reports a missing key instead of pretending the model is gone", async () => {
    delete process.env.GROQ_API_KEY;
    const result = await chatDetailed([{ role: "user", content: "hi" }]);
    expect(result).toEqual({ ok: false, text: null, reason: "missing-key" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces a revoked/incorrect key as unauthorized", async () => {
    fetchMock.mockResolvedValueOnce(modelsResponse(["qwen/qwen3.8-27b"]))
      .mockResolvedValueOnce(chatResponse({ error: "invalid" }, 401));
    const result = await chatDetailed([{ role: "user", content: "hi" }]);
    expect(result).toMatchObject({ ok: false, text: null, reason: "unauthorized", status: 401 });
  });

  it("surfaces a decommissioned model as model-unavailable", async () => {
    // The original regression: the served list no longer had the hardcoded model,
    // Groq answered 404, and the UI blamed a missing key.
    fetchMock.mockResolvedValueOnce(modelsResponse(["qwen/qwen3.8-27b"]))
      .mockResolvedValueOnce(chatResponse({ error: {} }, 404));
    const result = await chatDetailed([{ role: "user", content: "hi" }]);
    expect(result).toMatchObject({ ok: false, text: null, reason: "model-unavailable", status: 404 });
  });

  it("treats a 400 as bad-request, not as an unreachable provider", async () => {
    fetchMock.mockResolvedValueOnce(modelsResponse(["qwen/qwen3.8-27b"]))
      .mockResolvedValueOnce(chatResponse({ error: "context too long" }, 400));
    const result = await chatDetailed([{ role: "user", content: "hi" }]);
    expect(result).toMatchObject({ reason: "bad-request", status: 400 });
    expect(chatFailureMessage("bad-request")).not.toMatch(/could not be reached/i);
  });

  it("treats an empty completion as a failure, not a blank answer", async () => {
    fetchMock.mockResolvedValueOnce(modelsResponse(["qwen/qwen3.8-27b"]))
      .mockResolvedValueOnce(chatResponse({ choices: [{ message: { content: "   " } }] }));
    const result = await chatDetailed([{ role: "user", content: "hi" }]);
    expect(result).toMatchObject({ ok: false, reason: "empty-response" });
  });

  it("surfaces an upstream 500 with a bounded detail", async () => {
    fetchMock.mockResolvedValueOnce(modelsResponse(["qwen/qwen3.8-27b"]))
      .mockResolvedValueOnce(chatResponse({ error: "boom" }, 500));
    const result = await chatDetailed([{ role: "user", content: "hi" }]);
    expect(result).toMatchObject({ reason: "upstream-error", status: 500 });
  });

  it("never leaks the API key and bounds upstream detail", async () => {
    fetchMock.mockResolvedValueOnce(modelsResponse(["qwen/qwen3.8-27b"]))
      .mockResolvedValueOnce(chatResponse({ error: "x".repeat(1000) }, 500));
    const result = await chatDetailed([{ role: "user", content: "hi" }]);
    expect(JSON.stringify(result)).not.toContain("gsk_test_key");
    expect((result as { detail?: string }).detail!.length).toBeLessThanOrEqual(300);
  });

  it("bounds both upstream calls with a timeout", async () => {
    fetchMock.mockResolvedValueOnce(modelsResponse(["qwen/qwen3.8-27b"]))
      .mockResolvedValueOnce(chatResponse(COMPLETION));
    await chatDetailed([{ role: "user", content: "hi" }]);
    const chatCall = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    expect(chatCall[1].signal).toBeInstanceOf(AbortSignal);
    const modelsCall = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(modelsCall[1].signal).toBeInstanceOf(AbortSignal);
  });

  it("lists models once and reuses them for later calls", async () => {
    fetchMock.mockResolvedValue(modelsResponse(["qwen/qwen3.8-27b"]));
    await chatDetailed([{ role: "user", content: "hi" }]);
    await chatDetailed([{ role: "user", content: "again" }]);
    const modelCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/models"));
    expect(modelCalls).toHaveLength(1);
  });

  it("re-lists models after a 404 so a mid-window decommission self-heals", async () => {
    // No GROQ_MODEL, so the 404 path clears the cache; the retry then re-resolves.
    fetchMock.mockResolvedValueOnce(modelsResponse(["qwen/qwen3.8-27b"]))
      .mockResolvedValueOnce(chatResponse({ error: {} }, 404))
      .mockResolvedValueOnce(modelsResponse(["allam-2-7b"]))
      .mockResolvedValueOnce(chatResponse(COMPLETION));
    const result = await chatDetailed([{ role: "user", content: "hi" }]);
    expect(result).toMatchObject({ ok: true, model: "allam-2-7b" });

    // The cache really was invalidated: the 404 triggered a second /models call,
    // and the retry's result is cached again (no third call for the next request).
    fetchMock.mockResolvedValueOnce(chatResponse(COMPLETION));
    await chatDetailed([{ role: "user", content: "hi again" }]);
    const modelCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/models"));
    expect(modelCalls).toHaveLength(2);
  });

  it("does not retry when the caller pinned the model explicitly", async () => {
    fetchMock.mockResolvedValueOnce(chatResponse({ error: {} }, 404));
    const result = await chatDetailed([{ role: "user", content: "hi" }], { model: "some/model" });
    expect(result).toMatchObject({ reason: "model-unavailable" });
    // No /models call: an explicit model is the caller's decision.
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/models"))).toHaveLength(0);
  });

  it("self-heals a typo'd GROQ_MODEL by retrying once with auto-resolution", async () => {
    vi.stubEnv("GROQ_MODEL", "llama-9-imaginary");
    fetchMock.mockResolvedValueOnce(chatResponse({ error: {} }, 404))
      .mockResolvedValueOnce(modelsResponse(["qwen/qwen3.8-27b"]))
      .mockResolvedValueOnce(chatResponse(COMPLETION));
    const result = await chatDetailed([{ role: "user", content: "hi" }]);
    expect(result).toMatchObject({ ok: true, model: "qwen/qwen3.8-27b" });
  });
});

describe("resolveModel", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    __clearModelCache();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("GROQ_API_KEY", "gsk_test_key");
    vi.stubEnv("GROQ_MODEL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("prefers a preferred model the key actually serves", async () => {
    fetchMock.mockResolvedValueOnce(modelsResponse(["qwen/qwen3.8-27b", "allam-2-7b"]));
    expect(await resolveModel("k")).toBe("qwen/qwen3.8-27b");
  });

  it("picks the first served non-excluded model when none are preferred", async () => {
    fetchMock.mockResolvedValueOnce(modelsResponse(["some/new-chat-model", "other/model"]));
    expect(await resolveModel("k")).toBe("some/new-chat-model");
  });

  it("skips audio-only, guard and reasoning models", async () => {
    fetchMock.mockResolvedValueOnce(
      modelsResponse(["openai/gpt-oss-120b", "whisper-large-v3", "meta-llama/guard-7b"]),
    );
    expect(await resolveModel("k")).toBe("qwen/qwen3.8-27b");
  });

  it("skips models Groq still lists but has deactivated", async () => {
    fetchMock.mockResolvedValueOnce(
      modelsResponse([
        { id: "llama-3.3-70b-versatile", active: false },
        { id: "qwen/qwen3.8-27b", active: true },
      ]),
    );
    expect(await resolveModel("k")).toBe("qwen/qwen3.8-27b");
  });

  it("honours an explicit GROQ_MODEL override without listing models", async () => {
    vi.stubEnv("GROQ_MODEL", "allam-2-7b");
    expect(await resolveModel("k")).toBe("allam-2-7b");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("can ignore the override when self-healing", async () => {
    vi.stubEnv("GROQ_MODEL", "typo-model");
    fetchMock.mockResolvedValueOnce(modelsResponse(["qwen/qwen3.8-27b"]));
    expect(await resolveModel("k", { useOverride: false })).toBe("qwen/qwen3.8-27b");
  });

  it("returns the fallback when the model list is unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    expect(await resolveModel("k")).toBe("qwen/qwen3.8-27b");
  });

  it("does not cache a failed model listing", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    expect(await resolveModel("k")).toBe("qwen/qwen3.8-27b");
    fetchMock.mockResolvedValueOnce(modelsResponse(["allam-2-7b"]));
    expect(await resolveModel("k")).toBe("allam-2-7b");
  });
});

describe("chatFailureMessage", () => {
  it("only blames the key when the key is actually missing", () => {
    expect(chatFailureMessage("missing-key")).toMatch(/GROQ_API_KEY/);
    expect(chatFailureMessage("unauthorized")).toMatch(/rejected/i);
    expect(chatFailureMessage("model-unavailable")).toMatch(/GROQ_MODEL/);
    expect(chatFailureMessage("model-unavailable")).not.toMatch(/Set GROQ_API_KEY/);
    expect(chatFailureMessage("rate-limited")).toMatch(/rate limit/i);
    expect(chatFailureMessage("empty-response")).toMatch(/empty/i);
    expect(chatFailureMessage("bad-request")).toMatch(/rejected the request/i);
  });
});
