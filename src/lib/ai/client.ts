const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_CHAT = `${GROQ_BASE}/chat/completions`;

/** Every upstream call is bounded — a hung request must not hang the route. */
const CHAT_TIMEOUT_MS = 30_000;
const MODELS_TIMEOUT_MS = 5_000;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  /** Any Groq model id. Omit to auto-resolve (see {@link resolveModel}). */
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

const DEFAULT_OPTS: Required<Omit<ChatOptions, "model">> = {
  temperature: 0.3,
  maxTokens: 1024,
};

/**
 * Tie-breakers only, not a source of truth.
 *
 * Groq decommissions models and the set a key can use varies (free tier, paid
 * tier, region) — hardcoding one id is exactly what broke AI insights before, so
 * the real list always comes from `GET /openai/v1/models`.
 */
const PREFERRED_MODELS = ["qwen/qwen3.8-27b", "allam-2-7b"];

/**
 * Skipped during auto-resolution because `/models` may list ids that are not
 * usable through `/chat/completions`:
 *  - audio/transcription-only models (whisper) and guard models,
 *  - `openai/gpt-oss-*` reasoning models, which return `content: ""` with a
 *    normal token budget because reasoning consumes it — indistinguishable from a
 *    failed request. Set one explicitly via `GROQ_MODEL` if you want it (pair it
 *    with a much larger `max_tokens`).
 */
const EXCLUDED_MODEL = /whisper|guard|audio|gpt-oss/i;

const FALLBACK_MODEL = "qwen/qwen3.8-27b";
const MODEL_CACHE_MS = 10 * 60_000;

/** Why a chat call produced no text, so callers can tell the user the truth. */
export type ChatFailure =
  | "missing-key"
  | "unauthorized"
  | "model-unavailable"
  | "rate-limited"
  | "bad-request"
  | "empty-response"
  | "upstream-error";

export type ChatResult =
  | { ok: true; text: string; model: string }
  | {
      ok: false;
      text: null;
      model?: string;
      reason: ChatFailure;
      status?: number;
      detail?: string;
    };

type ModelCache = { at: number; apiKey: string; ids: string[] };

let modelCache: ModelCache | null = null;
let modelsInFlight: Promise<string[]> | null = null;

/** Test-only: drops the cached model list so each case starts cold. */
export function __clearModelCache(): void {
  modelCache = null;
}

async function listModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`${GROQ_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(MODELS_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: Array<{ id?: string; active?: boolean }> };
    const ids = (body.data ?? [])
      // Groq keeps decommissioned models listed with `active: false`; requesting
      // one 404s, so it must never be resolved.
      .filter((m) => m.active !== false)
      .map((m) => m.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    modelCache = { at: Date.now(), apiKey, ids };
    return ids;
  } catch {
    // Deliberately not cached: a blip must not pin a broken list for 10 minutes.
    return [];
  }
}

async function fetchModelIds(apiKey: string): Promise<string[]> {
  const cached = modelCache;
  if (cached && cached.apiKey === apiKey && Date.now() - cached.at < MODEL_CACHE_MS) {
    return cached.ids;
  }
  // De-duplicate concurrent cold starts: one /models call per process, not per request.
  modelsInFlight ??= listModels(apiKey).finally(() => {
    modelsInFlight = null;
  });
  return modelsInFlight;
}

/**
 * `GROQ_MODEL` wins, then the first preferred model this key actually serves, then
 * the first non-excluded served model, then a last-resort default.
 */
export async function resolveModel(
  apiKey: string,
  opts: { useOverride?: boolean } = {},
): Promise<string> {
  const override = opts.useOverride === false ? undefined : process.env.GROQ_MODEL?.trim();
  if (override) return override;

  const available = (await fetchModelIds(apiKey)).filter((id) => !EXCLUDED_MODEL.test(id));
  return PREFERRED_MODELS.find((id) => available.includes(id)) ?? available[0] ?? FALLBACK_MODEL;
}

/**
 * Chat completion with a real failure reason.
 *
 * Never throws and never exposes the API key: callers should surface `reason`
 * rather than assuming the key is missing, which is what made this hard to debug.
 */
export async function chatDetailed(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<ChatResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, text: null, reason: "missing-key" };

  const { temperature, maxTokens } = { ...DEFAULT_OPTS, ...opts };

  const attempt = async (model: string): Promise<ChatResult> => {
    try {
      const res = await fetch(GROQ_CHAT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
        signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
      });

      if (res.status === 401 || res.status === 403) {
        return { ok: false, text: null, model, reason: "unauthorized", status: res.status };
      }
      if (res.status === 404) {
        // Groq uses 404 only for model-not-found here; the chat path is a constant.
        return { ok: false, text: null, model, reason: "model-unavailable", status: 404 };
      }
      if (res.status === 429) {
        return { ok: false, text: null, model, reason: "rate-limited", status: 429 };
      }
      if (res.status === 400) {
        const detail = await res.text().catch(() => "");
        return { ok: false, text: null, model, reason: "bad-request", status: 400, detail: detail.slice(0, 300) };
      }
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        return {
          ok: false,
          text: null,
          model,
          reason: "upstream-error",
          status: res.status,
          detail: detail.slice(0, 300),
        };
      }

      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const text = body?.choices?.[0]?.message?.content?.trim();
      if (!text) {
        return { ok: false, text: null, model, reason: "empty-response", status: res.status };
      }
      return { ok: true, text, model };
    } catch (err) {
      return {
        ok: false,
        text: null,
        model,
        reason: "upstream-error",
        detail: err instanceof Error ? err.message.slice(0, 200) : "network error",
      };
    }
  };

  const pinned = Boolean(opts.model);
  let result = await attempt(opts.model ?? (await resolveModel(apiKey)));

  // A model can be decommissioned after we listed it, and a typo'd GROQ_MODEL would
  // 404 on every call. Either way: drop the cached list (and the override) and retry
  // exactly once. An explicitly pinned model is the caller's decision — don't second-guess it.
  if (!pinned && !result.ok && result.reason === "model-unavailable") {
    __clearModelCache();
    const retryModel = await resolveModel(apiKey, { useOverride: false });
    if (retryModel !== result.model) result = await attempt(retryModel);
  }

  return result;
}

/** End-user message for a failure reason. Names env vars, never values. */
export function chatFailureMessage(reason: ChatFailure): string {
  switch (reason) {
    case "missing-key":
      return "AI unavailable. Set GROQ_API_KEY in .env to enable.";
    case "unauthorized":
      return "Groq rejected the GROQ_API_KEY in .env (it may be revoked or mistyped).";
    case "model-unavailable":
      return "The Groq model isn't available on this API key. Set GROQ_MODEL in .env to one your account serves.";
    case "rate-limited":
      return "Groq rate limit reached — wait a moment and try again.";
    case "bad-request":
      return "The model rejected the request (too long, or an unsupported option). Try a shorter question.";
    case "empty-response":
      return "The model returned an empty answer. Try again, or set a different GROQ_MODEL in .env.";
    default:
      return "The AI provider returned an error. Try again shortly.";
  }
}
