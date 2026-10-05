import { NextRequest, NextResponse } from "next/server";
import { getIndicatorSeries } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const iso3 = searchParams.get("country");
  const indicatorId = searchParams.get("indicator");

  if (!iso3 || !indicatorId) {
    return NextResponse.json({ error: "country and indicator parameters are required" }, { status: 400 });
  }
  if (!/^[A-Za-z]{3}$/.test(iso3)) {
    return NextResponse.json({ error: "country must be a 3-letter ISO code" }, { status: 400 });
  }
  if (!/^[a-z0-9_]+$/i.test(indicatorId)) {
    return NextResponse.json({ error: "indicator must be a valid indicator id" }, { status: 400 });
  }

  const country = iso3.toUpperCase();
  try {
    const data = await getIndicatorSeries(country, indicatorId);
    return NextResponse.json({ iso3: country, indicator: indicatorId, data });
  } catch (err) {
    console.error("[api/indicators/series]", err);
    return NextResponse.json({ error: "Failed to load series" }, { status: 500 });
  }
}
