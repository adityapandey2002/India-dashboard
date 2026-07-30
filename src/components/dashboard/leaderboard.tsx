"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export type LeaderRow = { iso3: string; name: string; value: number | null; rank: number; isIndia?: boolean };

type Props = {
  rows: LeaderRow[];
  unit?: string;
  higherIsBetter?: boolean;
};

function fmtValue(v: number | null, unit?: string): string {
  if (v == null) return "—";
  let s: string;
  if (Math.abs(v) >= 1e12) s = `${(v / 1e12).toFixed(2)}T`;
  else if (Math.abs(v) >= 1e9)  s = `${(v / 1e9).toFixed(2)}B`;
  else if (Math.abs(v) >= 1e6)  s = `${(v / 1e6).toFixed(2)}M`;
  else if (Math.abs(v) >= 1e3)  s = `${(v / 1e3).toFixed(1)}k`;
  else s = v.toFixed(unit === "%" ? 1 : 0);
  return unit ? `${s} ${unit}` : s;
}

export function Leaderboard({ rows, unit }: Props) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Country</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.iso3} className={row.isIndia ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
              <TableCell className="font-mono text-xs text-muted-foreground">{row.rank}</TableCell>
              <TableCell className="font-medium">
                <Link href={`/country/${row.iso3}`} className="flex items-center gap-2 hover:text-amber-600 transition-colors">
                  {row.name}
                  {row.isIndia && <Badge variant="default" className="bg-amber-500 hover:bg-amber-500">You</Badge>}
                </Link>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {fmtValue(row.value, unit)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
