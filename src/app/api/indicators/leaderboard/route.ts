/**
 * API route: /api/indicators/leaderboard
 *
 * GET /api/indicators/leaderboard?indicator=gdp_current_usd&year=2024&limit=10
 * → [{ iso3: "USA", value: 28.7e12 }, ...]
 */

import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const indicator = searchParams.get("indicator");
  const year      = parseInt(searchParams.get("year") ?? "", 10);
  const limit     = parseInt(searchParams.get("limit") ?? "30", 10);

  if (!indicator || !year) {
    return NextResponse.json({ error: "indicator and year are required" }, { status: 400 });
  }

  try {
    const rows = getLeaderboard(indicator, year, limit);
    return NextResponse.json({ indicator, year, leaderboard: rows }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
