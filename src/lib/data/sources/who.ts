const WHO_API = "https://ghoapi.azureedge.net/api";

export type WhoDataPoint = {
  iso3: string;
  indicatorId: string;
  year: number;
  value: number | null;
};

const INDICATOR_CODES: Record<string, string> = {
  uhc_idx: "UHC_SCI_NCD",
  road_safety: "RS_198",
};

async function fetchWhoIndicator(whoCode: string, internalId: string): Promise<WhoDataPoint[]> {
  const url = `${WHO_API}/${whoCode}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "IndiaDashboard/0.1" },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

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
        if (val == null) return null;
        const num = parseFloat(String(val));
        return Number.isNaN(num) ? null : {
          iso3: row.SpatialDim as string,
          indicatorId: internalId,
          year,
          value: num,
        };
      })
      .filter((p: WhoDataPoint | null): p is WhoDataPoint => p != null);
  } catch {
    return [];
  }
}

export async function fetchWhoIndicatorData(indicatorId: string): Promise<WhoDataPoint[]> {
  const code = INDICATOR_CODES[indicatorId];
  if (!code) return [];
  return fetchWhoIndicator(code, indicatorId);
}

export const WHO_INDICATORS = {
  uhc_idx: { whoCode: "UHC_SCI_NCD", label: "UHC Service Coverage Index (NCD sub-index)" },
  road_safety: { whoCode: "RS_198", label: "Road traffic death rate (per 100k)" },
};
