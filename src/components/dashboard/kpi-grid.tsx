"use client";

import { useState } from "react";
import { Globe2, TrendingUp, Database, Calendar, BookOpen, Heart, BarChart3, Leaf, LineChart } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { IndicatorTrendDialog } from "@/components/dashboard/indicator-trend-dialog";

const ICONS = { Globe2, TrendingUp, Database, Calendar, BookOpen, Heart, BarChart3, Leaf } as const;

export type KpiCard = {
  label: string;
  value: string;
  hint?: string;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  icon: keyof typeof ICONS;
  indicatorId: string;
  category: string;
  unit?: string | null;
  description?: string | null;
};

export function KpiGrid({ cards }: { cards: KpiCard[] }) {
  const [selected, setSelected] = useState<KpiCard | null>(null);

  return (
    <>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {cards.map((kpi) => {
          const Icon = ICONS[kpi.icon] ?? LineChart;
          return (
            <button
              key={kpi.label}
              type="button"
              onClick={() => setSelected(kpi)}
              className="text-left rounded-xl transition-transform hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              title="Click for year-wise trend"
            >
              <StatCard
                label={kpi.label}
                value={kpi.value}
                hint={kpi.hint}
                icon={<Icon className="h-4 w-4 text-muted-foreground" />}
                trend={kpi.trend}
                trendLabel={kpi.trendLabel}
              />
            </button>
          );
        })}
      </section>

      {selected && (
        <IndicatorTrendDialog
          open={true}
          onOpenChange={(open) => { if (!open) setSelected(null); }}
          indicatorId={selected.indicatorId}
          indicatorName={selected.label}
          category={selected.category}
          unit={selected.unit}
          description={selected.description}
        />
      )}
    </>
  );
}
