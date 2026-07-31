import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";
import { getGlobalLatest } from "@/lib/db/queries";

type GlobalPoint = { iso3: string; value: number; year: number };

function pearson(points: Array<{ x: number; y: number }>): number | null {
  if (points.length < 3) return null;
  const n = points.length;
  let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
  for (const p of points) {
    sx += p.x; sy += p.y;
    sxy += p.x * p.y;
    sxx += p.x * p.x;
    syy += p.y * p.y;
  }
  const denom = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  if (denom === 0) return null;
  return (n * sxy - sx * sy) / denom;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const xId = searchParams.get("x");
  const yId = searchParams.get("y");

  if (!xId || !yId) {
    return NextResponse.json({ error: "x and y indicator parameters are required" }, { status: 400 });
  }

  const [indicatorRows, countries, xGlobal, yGlobal] = await Promise.all([
    query<{ id: string; name: string; unit: string | null }>(
      `SELECT id, name, unit FROM indicators WHERE id IN (?, ?)`,
      [xId, yId],
    ),
    query<{ iso3: string; name: string }>(`SELECT iso3, name FROM countries`),
    getGlobalLatest(xId),
    getGlobalLatest(yId),
  ]);

  const xById = new Map(indicatorRows.map((i) => [i.id, i]));
  const nameByIso = new Map(countries.map((c) => [c.iso3, c.name]));

  const xByIso = new Map<string, GlobalPoint>(xGlobal.map((p) => [p.iso3, p]));
  const yByIso = new Map<string, GlobalPoint>(yGlobal.map((p) => [p.iso3, p]));

  const points: Array<{
    iso3: string; name: string; x: number; y: number; xYear: number; yYear: number;
  }> = [];
  for (const [iso3, xp] of xByIso) {
    const yp = yByIso.get(iso3);
    if (!yp) continue;
    points.push({ iso3, name: nameByIso.get(iso3) ?? iso3, x: xp.value, y: yp.value, xYear: xp.year, yYear: yp.year });
  }

  const india = points.find((p) => p.iso3 === "IND") ?? null;
  const corr = pearson(points.map((p) => ({ x: p.x, y: p.y })));

  return NextResponse.json({
    x: xById.get(xId) ?? { id: xId, name: xId, unit: null },
    y: xById.get(yId) ?? { id: yId, name: yId, unit: null },
    points,
    correlation: corr,
    india,
  });
}
