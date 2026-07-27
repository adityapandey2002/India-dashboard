const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

export type GroqModel = "llama-3.3-70b-versatile" | "mixtral-8x7b-32768" | "gemma2-9b-it";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  model?: GroqModel;
  temperature?: number;
  maxTokens?: number;
};

const DEFAULT_OPTS: ChatOptions = {
  model: "llama-3.3-70b-versatile",
  temperature: 0.3,
  maxTokens: 1024,
};

export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const { model, temperature, maxTokens } = { ...DEFAULT_OPTS, ...opts };

  try {
    const res = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) return null;

    const body = await res.json();
    return body?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function generateInsight(
  context: string,
  question: string,
): Promise<string | null> {
  return chat([
    {
      role: "system",
      content: `You are a data analyst helping interpret global development indicators for India compared to other countries. Be concise, data-driven, and insightful. Keep responses under 200 words.`,
    },
    {
      role: "user",
      content: `Here is the relevant data context:\n\n${context}\n\nQuestion: ${question}`,
    },
  ]);
}
