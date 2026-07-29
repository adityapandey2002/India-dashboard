"use client";

import { Download, FileText, Printer } from "lucide-react";

type ReportEntry = {
  id: string;
  name: string;
  value: number | null;
  year: number | null;
  unit: string | null;
  rank: number | null;
  total: number | null;
  trendLabel: string | null;
};

export function ExportButtons({
  reportData,
  reportYear,
  totalCountries,
  totalIndicators,
  totalDataPoints,
}: {
  reportData: Record<string, ReportEntry[]>;
  reportYear: number;
  totalCountries: number;
  totalIndicators: number;
  totalDataPoints: number;
}) {
  const handlePrint = () => {
    window.print();
  };

  const handleCsv = () => {
    const rows: string[] = ["Category,Indicator,Value,Unit,Year,Rank,Total,Trend"];

    for (const [cat, entries] of Object.entries(reportData)) {
      for (const e of entries) {
        const value = e.value != null ? e.value.toString() : "";
        const unit = e.unit ?? "";
        const year = e.year?.toString() ?? "";
        const rank = e.rank != null ? `#${e.rank}` : "";
        const total = e.total?.toString() ?? "";
        const trend = e.trendLabel ?? "";
        const escapedName = `"${e.name.replace(/"/g, '""')}"`;
        rows.push([cat, escapedName, value, unit, year, rank, total, trend].join(","));
      }
    }

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `india-report-card-${reportYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex justify-center gap-4 mt-4 print:hidden">
      <button
        onClick={handlePrint}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Printer className="h-4 w-4" />
        Print / Save PDF
      </button>
      <button
        onClick={handleCsv}
        className="flex items-center gap-2 px-4 py-2 border border-input rounded-lg hover:bg-accent transition-colors"
      >
        <FileText className="h-4 w-4" />
        Export CSV
      </button>
    </div>
  );
}
