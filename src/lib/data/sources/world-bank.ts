/**
 * World Bank API v2 client.
 *
 * API docs: https://datahelpdesk.worldbank.org/knowledgebase/articles/898581
 *
 * The API is free, no auth, and returns JSON. The catch is that
 * responses are paginated (max ~32k rows per page) and a single
 * indicator/country combo can return 60+ years of data, so we
 * always request a date range.
 *
 * Example call:
 *   GET https://api.worldbank.org/v2/country/IND;USA;CHN/indicator/NY.GDP.MKTP.CD?format=json&date=2010:2024&per_page=200
 */

const WB_API = "https://api.worldbank.org/v2";

export type WbCountry = {
  id: string;          // ISO3 e.g. "IND"
  iso2Code: string;    // ISO2 e.g. "IN"
  name: string;
  region: { id: string; value: string };
  incomeLevel: { id: string; value: string };
  latitude: string;
  longitude: string;
};

export type WbDataPoint = {
  indicator: { id: string; value: string };
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;            // year as string
  value: number | null;    // null if no data
  unit: string;
  obs_status: string;
  decimal: number;
};

type WbEnvelope<T> = [WbMeta, T[]] | WbMeta;
type WbMeta = {
  page: number;
  pages: number;
  per_page: string | number;
  total: number;
  sourceid?: string;
  lastupdated?: string;
};

class HttpError extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
    this.name = "HttpError";
  }
}

/**
 * Fetch one page of the World Bank API.
 * Throws on non-200, returns the envelope (an array [meta, rows]).
 */
async function wbFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<WbEnvelope<T>> {
  const url = new URL(`${WB_API}${path}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("per_page", "20000"); // ask for everything in one shot
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "IndiaInGlobalDashboard/0.1 (+https://github.com/...)" },
    // ISR-friendly: cache for 1 day. Real data is annual.
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) throw new HttpError(res.status, `World Bank API ${res.status}: ${url}`);
  return (await res.json()) as WbEnvelope<T>;
}

/** True if the envelope is the actual 2-element array (data present). */
function isDataEnvelope<T>(env: WbEnvelope<T>): env is [WbMeta, T[]] {
  return Array.isArray(env) && env.length === 2;
}

/**
 * Fetch a list of all countries the World Bank tracks.
 * Used to populate the `countries` table on first run.
 */
export async function fetchAllCountries(): Promise<WbCountry[]> {
  const env = await wbFetch<WbCountry>("/country", { per_page: 400 });
  if (!isDataEnvelope(env)) return [];
  // WB returns aggregate regions too (e.g. "World", "Europe"). Filter them.
  return env[1].filter((c) => c.region.id !== "NA" && c.id.length === 3);
}

/**
 * Fetch a single indicator for many countries over a year range.
 *
 * @param sourceId World Bank indicator code, e.g. "NY.GDP.MKTP.CD"
 * @param countries list of ISO3 codes, e.g. ["IND","USA","CHN"]. Empty = all.
 * @param fromYear start year (inclusive)
 * @param toYear   end year (inclusive)
 */
export async function fetchIndicator(
  sourceId: string,
  countries: string[] = [],
  fromYear: number = 1960,
  toYear: number = new Date().getFullYear(),
): Promise<WbDataPoint[]> {
  const countryPath = countries.length ? `/country/${countries.join(";")}` : "/country/all";
  const env = await wbFetch<WbDataPoint>(`${countryPath}/indicator/${sourceId}`, {
    date: `${fromYear}:${toYear}`,
  });
  if (!isDataEnvelope(env)) return [];
  return env[1].filter((d) => d.value !== null);
}
