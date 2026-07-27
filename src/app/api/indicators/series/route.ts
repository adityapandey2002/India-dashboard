/**
 * API route: /api/indicators/series
 *
 * GET /api/indicators/series?country=IND&indicator=gdp_current_usd
 * → [{ year: 2020, value: 2.67e12 }, ...]
 */

import { NextRequest, NextResponse } from "next/server";
import { getIndicatorSeries } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country   = searchParams.get("country");
  const indicator = searchParams.get("indicator");

  if (!country || !indicator) {
    return NextResponse.json({ error: "country and indicator are required" }, { status: 400 });
  }

  try {
    const data = getIndicatorSeries(country, indicator);
    return NextResponse.json({ country, indicator, points: data }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
