"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { iso3: string; countryName: string };

/**
 * On-demand AI analysis for a country page. Calls POST /api/ai/insights, which
 * shares the same Groq client (and GROQ_API_KEY) as /api/ai/chat.
 */
export function CountryInsight({ iso3, countryName }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iso3 }),
      });
      const body = await res.json();
      if (!res.ok) {
        // Trust the server's reason (it distinguishes a missing key from a bad key
        // from a decommissioned model) instead of guessing from the status code.
        setError(body.error ?? "Could not generate analysis.");
        return;
      }
      setAnalysis(body.analysis);
    } catch {
      setError("Could not generate analysis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-amber-500" />
          AI analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!analysis && !loading && !error && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              A 3-sentence read on {countryName}&apos;s latest indicators — GDP, HDI,
              life expectancy and CO₂ trends in global context.
            </p>
            <Button size="sm" variant="outline" onClick={run}>
              <Sparkles className="h-3.5 w-3.5" />
              Analyse this country
            </Button>
          </div>
        )}

        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analysing {countryName}&apos;s indicators...
          </p>
        )}

        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
            <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </p>
            <Button size="sm" variant="outline" onClick={run}>
              Try again
            </Button>
          </div>
        )}

        {analysis && (
          <div className="space-y-2">
            <p className="text-sm whitespace-pre-line leading-relaxed">{analysis}</p>
            <Button size="sm" variant="ghost" onClick={() => setAnalysis(null)}>
              Regenerate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
