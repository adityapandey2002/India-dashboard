"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Search, Database, Globe, BarChart3 } from "lucide-react";

type IndicatorCoverage = {
  indicatorId: string;
  indicatorName: string;
  category: string;
  source: string;
  dataPoints: number;
  countriesWithData: number;
  firstYear: number | null;
  lastYear: number | null;
};

export function ExploreClient({
  coverage,
  categories,
}: {
  coverage: IndicatorCoverage[];
  categories: string[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = coverage.filter((c) => {
    if (category !== "all" && c.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.indicatorName.toLowerCase().includes(q) ||
        c.indicatorId.toLowerCase().includes(q) ||
        c.source.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const hasData = (c: IndicatorCoverage) => c.dataPoints > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search indicators..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="h-9 flex-wrap">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs capitalize">
                {cat.replace("_", " ")}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <Link
            key={c.indicatorId}
            href={`/compare?indicator=${c.indicatorId}`}
            className="group rounded-lg border p-4 transition-colors hover:border-amber-400 hover:bg-amber-50/50 dark:hover:border-amber-600 dark:hover:bg-amber-950/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium group-hover:text-amber-700 dark:group-hover:text-amber-300">
                  {c.indicatorName}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.indicatorId}</p>
              </div>
              {hasData(c) ? (
                <Badge variant="default" className="shrink-0 bg-green-600 text-xs">data</Badge>
              ) : (
                <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">no data</Badge>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                {c.dataPoints.toLocaleString()} pts
              </span>
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {c.countriesWithData} countries
              </span>
              {c.firstYear && c.lastYear && (
                <span className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {c.firstYear}–{c.lastYear}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground capitalize">Source: {c.source}</p>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          No indicators match your search.
        </p>
      )}
    </div>
  );
}
