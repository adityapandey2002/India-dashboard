/**
 * TypeScript types that mirror the database schema.
 *
 * These are the shapes we work with in app code. The DB layer
 * (src/lib/db/client.ts) is responsible for converting rows to
 * these types — they never leak raw SQLite objects to the UI.
 */

export type Country = {
  iso3: string;
  iso2: string | null;
  name: string;
  region: string | null;
  incomeGroup: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type Category =
  | "economy"
  | "society"
  | "governance"
  | "technology"
  | "education"
  | "healthcare"
  | "environment"
  | "safety"
  | "equality"
  | "digital_gov";

export type Indicator = {
  id: string;
  name: string;
  category: Category;
  source: string;
  sourceId: string;
  unit: string | null;
  description: string | null;
  updateFreq: string | null;
};

export type DataPoint = {
  countryIso3: string;
  indicatorId: string;
  year: number;
  value: number | null;
  rank: number | null;
  fetchedAt: string;
};

export type Source = {
  id: string;
  name: string;
  url: string | null;
  type: "api" | "csv" | "pdf" | "scrape";
};

/** Helper: turn a raw row (snake_case columns) into our camelCase types. */
export function rowToCountry(r: Record<string, unknown>): Country {
  return {
    iso3: r.iso3 as string,
    iso2: (r.iso2 as string | null) ?? null,
    name: r.name as string,
    region: (r.region as string | null) ?? null,
    incomeGroup: (r.income_group as string | null) ?? null,
    latitude: (r.latitude as number | null) ?? null,
    longitude: (r.longitude as number | null) ?? null,
  };
}

export function rowToIndicator(r: Record<string, unknown>): Indicator {
  return {
    id: r.id as string,
    name: r.name as string,
    category: r.category as Category,
    source: r.source as string,
    sourceId: r.source_id as string,
    unit: (r.unit as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    updateFreq: (r.update_freq as string | null) ?? null,
  };
}

export function rowToDataPoint(r: Record<string, unknown>): DataPoint {
  return {
    countryIso3: r.country_iso3 as string,
    indicatorId: r.indicator_id as string,
    year: r.year as number,
    value: (r.value as number | null) ?? null,
    rank: (r.rank as number | null) ?? null,
    fetchedAt: r.fetched_at as string,
  };
}
