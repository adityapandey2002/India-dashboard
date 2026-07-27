const WIPO_API = "https://www3.wipo.int/ipstats/api";

export type WipoDataPoint = {
  iso3: string;
  indicatorId: string;
  year: number;
  value: number | null;
};

async function fetchWipoIndicator(endpoint: string): Promise<WipoDataPoint[]> {
  const url = `${WIPO_API}/${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "IndiaDashboard/0.1", "Accept": "application/json" },
    });

    if (!res.ok) return [];

    const body = await res.json();
    if (!Array.isArray(body)) return [];

    return body
      .filter((row: Record<string, unknown>) => {
        const iso = (row.iso3 ?? row.country ?? "") as string;
        return iso.length === 3;
      })
      .map((row: Record<string, unknown>) => ({
        iso3: (row.iso3 ?? row.country ?? "") as string,
        indicatorId: (row.indicator ?? "") as string,
        year: parseInt(String(row.year ?? "0"), 10),
        value: row.value != null ? parseFloat(String(row.value)) : null,
      }))
      .filter((p: WipoDataPoint) => p.value != null && !Number.isNaN(p.value) && p.year >= 2010);
  } catch {
    return [];
  }
}

export async function fetchWipoData(indicatorId: string): Promise<WipoDataPoint[]> {
  switch (indicatorId) {
    case "innovation_idx":
      return fetchWipoIndicator("gii");
    case "patents_per_million":
      return fetchWipoIndicator("patents");
    default:
      return [];
  }
}

export const WIPO_INDICATORS = {
  innovation_idx: { label: "Global Innovation Index" },
  patents_per_million: { label: "Patent applications" },
};
