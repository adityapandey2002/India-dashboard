const WHO_API = "https://ghoapi.azureedge.net/api";

export type WhoDataPoint = {
  iso3: string;
  indicatorId: string;
  year: number;
  value: number | null;
};

const INDICATOR_CODES: Record<string, string> = {
  uhc_idx: "UHC_INDEX",
  road_safety: "RS_2030_1",
};

async function fetchWhoIndicator(whoCode: string): Promise<WhoDataPoint[]> {
  const url = `${WHO_API}/${whoCode}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "IndiaDashboard/0.1" },
  });

  if (!res.ok) throw new Error(`WHO API ${res.status}: ${url}`);

  const body = await res.json();
  if (!body?.value) return [];

  return body.value
    .filter((row: Record<string, unknown>) => {
      const geo = row.SpatialDim as string;
      return geo?.length === 3;
    })
    .map((row: Record<string, unknown>) => {
      const timeDim = row.TimeDim as string | number;
      const year = typeof timeDim === "string" ? parseInt(timeDim, 10) : timeDim;
      const val = row.Value as string | number | null;
      return {
        iso3: row.SpatialDim as string,
        indicatorId: row.IndicatorCode as string,
        year,
        value: val != null ? parseFloat(String(val)) : null,
      };
    })
    .filter((p: WhoDataPoint) => p.value != null && !Number.isNaN(p.value));
}

export async function fetchWhoIndicatorData(indicatorId: string): Promise<WhoDataPoint[]> {
  const code = INDICATOR_CODES[indicatorId];
  if (!code) return [];
  return fetchWhoIndicator(code);
}

export const WHO_INDICATORS = {
  uhc_idx: { whoCode: "UHC_INDEX", label: "UHC Service Coverage Index" },
  road_safety: { whoCode: "RS_2030_1", label: "Road traffic deaths" },
};
