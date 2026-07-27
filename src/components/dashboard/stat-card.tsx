"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  icon?: React.ReactNode;
};

export function StatCard({ label, value, hint, trend, trendLabel, icon }: StatCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {icon}
        </div>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
        <div className="mt-1 flex items-center gap-2 text-sm">
          {trend && (
            <span className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              {trendLabel}
            </span>
          )}
          {hint && !trend && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
