const HF_EMBED_URL =
  "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2";

export async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(HF_EMBED_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!res.ok) return null;

    const body = await res.json();
    return Array.isArray(body) ? body[0] ?? null : body ?? null;
  } catch {
    return null;
  }
}

export async function getEmbeddings(texts: string[]): Promise<number[][] | null> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(HF_EMBED_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: texts }),
    });

    if (!res.ok) return null;

    return await res.json();
  } catch {
    return null;
  }
}
