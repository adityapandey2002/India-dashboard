const OWID_CO2_URL = "https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv";

export type OwidDataPoint = {
  iso3: string;
  indicatorId: string;
  year: number;
  value: number;
};

export async function fetchOwidCo2Data(indicatorId: string): Promise<OwidDataPoint[]> {
  const allowed = new Set(["co2_per_capita", "co2_emissions_total"]);
  if (!allowed.has(indicatorId)) return [];

  try {
    const res = await fetch(OWID_CO2_URL, {
      headers: { "User-Agent": "IndiaDashboard/0.1" },
    });
    if (!res.ok) return [];

    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",");
    const isoCol = headers.indexOf("iso_code");
    const yearCol = headers.indexOf("year");
    const colMap: Record<string, number> = {
      co2_per_capita: headers.indexOf("co2_per_capita"),
      co2_emissions_total: headers.indexOf("co2"),
    };
    const valCol = colMap[indicatorId];
    if (valCol < 0 || isoCol < 0 || yearCol < 0) return [];

    const points: OwidDataPoint[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const iso3 = cols[isoCol]?.trim();
      const year = parseInt(cols[yearCol]?.trim(), 10);
      const val = cols[valCol]?.trim();

      if (!iso3 || iso3.length !== 3 || !year || year < 2010) continue;
      if (!val || val === "") continue;

      const num = parseFloat(val);
      if (Number.isNaN(num)) continue;

      points.push({ iso3, indicatorId, year, value: num });
    }
    return points;
  } catch {
    return [];
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
