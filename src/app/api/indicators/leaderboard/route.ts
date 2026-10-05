import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getLatestYear } from "@/lib/db/queries";
import { isHigherBetter } from "@/lib/rank-direction";
import { query } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const indicatorId = searchParams.get("indicator");
  const yearParam = searchParams.get("year");
  const limitParam = searchParams.get("limit");

  if (!indicatorId) {
    return NextResponse.json({ error: "indicator parameter is required" }, { status: 400 });
  }
  if (!/^[a-z0-9_]+$/i.test(indicatorId)) {
    return NextResponse.json({ error: "indicator must be a valid indicator id" }, { status: 400 });
  }

  // parseInt("abc") is NaN, which used to be bound as an INTEGER and throw an
  // unhandled 500 — and `limit` was never range-checked.
  const parsedYear = yearParam === null ? null : Number.parseInt(yearParam, 10);
  if (yearParam !== null && !Number.isInteger(parsedYear)) {
    return NextResponse.json({ error: "year must be an integer" }, { status: 400 });
  }
  const parsedLimit = limitParam === null ? 30 : Number.parseInt(limitParam, 10);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    return NextResponse.json({ error: "limit must be a positive integer" }, { status: 400 });
  }
  const limit = Math.min(parsedLimit, 250);

  try {
    const year = parsedYear ?? (await getLatestYear(indicatorId)) ?? new Date().getFullYear();
    const data = await getLeaderboard(indicatorId, year, limit, isHigherBetter(indicatorId));
    const years = await query<{ yr: number }>(
      `SELECT DISTINCT year AS yr FROM data_points
       WHERE indicator_id = ? AND value IS NOT NULL
       ORDER BY yr DESC`,
      [indicatorId],
    );
    return NextResponse.json({
      indicator: indicatorId,
      year,
      years: years.map((r) => r.yr),
      data,
    });
  } catch (err) {
    console.error("[api/indicators/leaderboard]", err);
    return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }
}
