const ITU_API = "https://datahub.itu.int/api";

export type ItuDataPoint = {
  iso3: string;
  indicatorId: string;
  year: number;
  value: number | null;
};

async function fetchItuIndicator(endpoint: string): Promise<ItuDataPoint[]> {
  const url = `${ITU_API}/${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "IndiaDashboard/0.1" },
    });

    if (!res.ok) return [];

    const body = await res.json();
    if (!Array.isArray(body)) return [];

    return body
      .filter((row: Record<string, unknown>) => {
        const iso = (row.iso3 ?? row.country_code ?? "") as string;
        return iso.length === 3;
      })
      .map((row: Record<string, unknown>) => ({
        iso3: (row.iso3 ?? row.country_code ?? "") as string,
        indicatorId: (row.indicator_id ?? "") as string,
        year: parseInt(String(row.year ?? row.time_period ?? "0"), 10),
        value: row.value != null ? parseFloat(String(row.value)) : null,
      }))
      .filter((p: ItuDataPoint) => p.value != null && !Number.isNaN(p.value) && p.year >= 2010);
  } catch {
    return [];
  }
}

export async function fetchItuData(indicatorId: string): Promise<ItuDataPoint[]> {
  switch (indicatorId) {
    case "cyber_security":
      return fetchItuIndicator("gci");
    case "ict_development":
      return fetchItuIndicator("idi");
    default:
      return [];
  }
}

export const ITU_INDICATORS = {
  cyber_security: { label: "Global Cybersecurity Index" },
  ict_development: { label: "ICT Development Index" },
};
