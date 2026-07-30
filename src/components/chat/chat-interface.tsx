"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Loader2, ChevronDown, ChevronRight, MessageSquare } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: { id: string; source: string; text: string }[];
};

const SUGGESTIONS = [
  "How does India rank on GDP globally?",
  "What's India's life expectancy trend?",
  "How does India compare to China on HDI?",
  "What was the impact of COVID-19 on India's economy?",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm the India Dashboard AI. Ask me anything about India's global development indicators — GDP, HDI, life expectancy, CO₂ emissions, internet penetration, and more. I can also compare India with other countries and show trends over time.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role !== "assistant" || messages.indexOf(m) < messages.length - 1)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, conversationHistory: history }),
      });
      const json = await res.json();

      if (json.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${json.error}` }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.answer, citations: json.citations },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to reach the AI. Check your network connection." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <div className="flex-1 space-y-4 overflow-y-auto py-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-amber-600 text-white"
                  : "bg-muted"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              {msg.citations && msg.citations.length > 0 && (
                <details className="mt-2">
                  <summary className="flex cursor-pointer items-center gap-1 text-xs opacity-60 hover:opacity-100">
                    <ChevronRight className="h-3 w-3" />
                    {msg.citations.length} source{msg.citations.length > 1 ? "s" : ""}
                  </summary>
                  <div className="mt-1 space-y-1">
                    {msg.citations.map((c) => (
                      <div key={c.id} className="rounded bg-background/50 px-2 py-1 text-xs">
                        <span className="font-mono text-amber-600">{c.id}</span>
                        <span className="ml-2 text-muted-foreground">{c.source}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && !loading && (
        <div className="grid grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setInput(s);
              }}
              className="rounded-lg border bg-card px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 pb-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about India's global indicators..."
          className="flex-1 rounded-xl border bg-background px-4 py-3 text-sm outline-none ring-amber-600/30 focus:ring-2"
          disabled={loading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-amber-600 hover:bg-amber-700"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
