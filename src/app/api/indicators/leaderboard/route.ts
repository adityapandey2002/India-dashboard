import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getLatestYear } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const indicatorId = searchParams.get("indicator");
  const yearParam = searchParams.get("year");
  const limitParam = searchParams.get("limit");

  if (!indicatorId) {
    return NextResponse.json({ error: "indicator parameter is required" }, { status: 400 });
  }

  const year = yearParam ? parseInt(yearParam, 10) : (await getLatestYear(indicatorId)) ?? new Date().getFullYear();
  const limit = limitParam ? parseInt(limitParam, 10) : 30;

  const data = await getLeaderboard(indicatorId, year, limit);
  return NextResponse.json({ indicator: indicatorId, year, data });
}
