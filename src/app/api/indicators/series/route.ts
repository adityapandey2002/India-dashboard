import { NextRequest, NextResponse } from "next/server";
import { getIndicatorSeries } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const iso3 = searchParams.get("country");
  const indicatorId = searchParams.get("indicator");

  if (!iso3 || !indicatorId) {
    return NextResponse.json({ error: "country and indicator parameters are required" }, { status: 400 });
  }

  const data = await getIndicatorSeries(iso3, indicatorId);
  return NextResponse.json({ iso3, indicator: indicatorId, data });
}
