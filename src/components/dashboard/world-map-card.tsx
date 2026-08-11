"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3-geo";
import { feature } from "topojson-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { isHigherBetter } from "@/lib/rank-direction";

type Props = {
  indicators: Array<{ id: string; name: string; category: string; unit?: string | null; description?: string | null }>;
  regions?: Record<string, string | null>;
};

/** topojson `id` is the numeric ISO-3166-1 code → ISO3 for linking/coloring.
 *  Countries we never plot are mapped to null (Antarctica is dropped entirely
 *  so the Mercator fit isn't stretched). */
const NUM_ID_TO_ISO3: Record<string, string | null> = {
  "004": "AFG", "008": "ALB", "012": "DZA", "024": "AGO", "031": "AZE",
  "032": "ARG", "036": "AUS", "040": "AUT", "050": "BGD", "051": "ARM",
  "056": "BEL", "064": "BTN", "068": "BOL", "070": "BIH", "072": "BWA",
  "044": "BHS", "270": "GMB", "729": "SDN",
  "076": "BRA", "084": "BLZ", "090": "SLB", "096": "BRN", "100": "BGR",
  "104": "MMR", "108": "BDI", "112": "BLR", "116": "KHM", "120": "CMR",
  "124": "CAN", "140": "CAF", "144": "LKA", "148": "TCD", "152": "CHL",
  "156": "CHN", "158": "TWN", "170": "COL", "178": "COG", "180": "COD",
  "188": "CRI", "191": "HRV", "192": "CUB", "196": "CYP", "203": "CZE",
  "204": "BEN", "208": "DNK", "214": "DOM", "218": "ECU", "222": "SLV",
  "226": "GNQ", "231": "ETH", "232": "ERI", "233": "EST", "238": null,
  "242": "FJI", "246": "FIN", "250": "FRA", "260": null, "262": "DJI",
  "266": "GAB", "268": "GEO", "275": "PSE", "276": "DEU", "288": "GHA",
  "300": "GRC", "304": null, "320": "GTM", "324": "GIN", "328": "GUY",
  "332": "HTI", "340": "HND", "348": "HUN", "352": "ISL", "356": "IND",
  "360": "IDN", "364": "IRN", "368": "IRQ", "372": "IRL", "376": "ISR",
  "380": "ITA", "384": "CIV", "388": "JAM", "392": "JPN", "398": "KAZ",
  "400": "JOR", "404": "KEN", "408": "PRK", "410": "KOR", "414": "KWT",
  "417": "KGZ", "418": "LAO", "422": "LBN", "426": "LSO", "428": "LVA",
  "430": "LBR", "434": "LBY", "440": "LTU", "442": "LUX", "450": "MDG",
  "454": "MWI", "458": "MYS", "466": "MLI", "478": "MRT", "484": "MEX",
  "496": "MNG", "498": "MDA", "499": "MNE", "504": "MAR", "508": "MOZ",
  "512": "OMN", "516": "NAM", "524": "NPL", "528": "NLD", "540": "NCL",
  "548": "VUT", "554": "NZL", "558": "NIC", "562": "NER", "566": "NGA",
  "578": "NOR", "586": "PAK", "591": "PAN", "598": "PNG", "600": "PRY",
  "604": "PER", "608": "PHL", "616": "POL", "620": "PRT", "624": "GNB",
  "626": "TLS", "630": "PRI", "634": "QAT", "642": "ROU", "643": "RUS",
  "646": "RWA", "682": "SAU", "686": "SEN", "688": "SRB", "694": "SLE",
  "703": "SVK", "704": "VNM", "705": "SVN", "706": "SOM", "710": "ZAF",
  "716": "ZWE", "724": "ESP", "728": "SSD", "732": null, "740": "SUR",
  "748": "SWZ", "752": "SWE", "756": "CHE", "760": "SYR", "762": "TJK",
  "764": "THA", "768": "TGO", "780": "TTO", "784": "ARE", "788": "TUN",
  "792": "TUR", "795": "TKM", "800": "UGA", "804": "UKR", "807": "MKD",
  "818": "EGY", "826": "GBR", "834": "TZA", "840": "USA", "854": "BFA",
  "858": "URY", "860": "UZB", "862": "VEN", "887": "YEM", "894": "ZMB",
};

const HISTORICAL_EVENTS = [
  { year: 2020, label: "COVID-19", description: "Global pandemic caused economic contraction, supply chain disruption, and accelerated digital adoption worldwide." },
  { year: 2016, label: "Demonetization", description: "India withdrew ₹500/₹1000 notes (86% of cash), causing short-term GDP dip and accelerated digital payments." },
  { year: 2014, label: "PM Modi elected", description: "Policy shift toward Make in India, GST (2017), IBC (2016), infrastructure push." },
  { year: 2008, label: "Global Financial Crisis", description: "World trade collapsed; India relatively resilient due to domestic demand." },
  { year: 2004, label: "Tsunami", description: "Indian Ocean tsunami impacted coastal economies; massive reconstruction spending followed." },
  { year: 1991, label: "Economic Liberalization", description: "India ended License Raj, opened to FDI, devalued rupee." },
];

/** Pastel sequential palette (light → deep): cream → mint → teal → cyan → soft blue → lavender. */
const PASTEL_STOPS: Array<[number, number, number]> = [
  [254, 249, 195], // yellow-100
  [187, 247, 208], // green-200
  [153, 246, 228], // teal-200
  [165, 243, 252], // cyan-200
  [191, 219, 254], // blue-200
  [221, 214, 254], // violet-200
];

const CONTINENTS: Array<{ key: string; label: string; regions: string[] }> = [
  { key: "world", label: "World", regions: [] },
  { key: "south-asia", label: "South Asia", regions: ["South Asia"] },
  { key: "east-asia", label: "East Asia & Pacific", regions: ["East Asia & Pacific"] },
  { key: "europe", label: "Europe & Central Asia", regions: ["Europe & Central Asia"] },
  { key: "mena", label: "Middle East & North Africa", regions: ["Middle East & North Africa"] },
  { key: "africa", label: "Sub-Saharan Africa", regions: ["Sub-Saharan Africa"] },
  { key: "lac", label: "Latin America & Caribbean", regions: ["Latin America & Caribbean"] },
  { key: "north-america", label: "North America", regions: ["North America"] },
];

function pastelColor(t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (PASTEL_STOPS.length - 1);
  const i = Math.min(Math.floor(x), PASTEL_STOPS.length - 2);
  const f = x - i;
  const [r1, g1, b1] = PASTEL_STOPS[i];
  const [r2, g2, b2] = PASTEL_STOPS[i + 1];
  return `rgb(${Math.round(r1 + (r2 - r1) * f)}, ${Math.round(g1 + (g2 - g1) * f)}, ${Math.round(b1 + (b2 - b1) * f)})`;
}

const LEGEND_GRADIENT = `linear-gradient(to right, ${PASTEL_STOPS.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`).join(", ")})`;

function fmtCompact(v: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

export function WorldMapCard({ indicators, regions }: Props) {
  const [selectedIndicator, setSelectedIndicator] = useState("gdp_current_usd");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [data, setData] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [paths, setPaths] = useState<{ id: string; name: string; path: string; label: { x: number; y: number } | null }[]>([]);
  const [hovered, setHovered] = useState<{ name: string; value: number | null } | null>(null);
  const [yearsWithData, setYearsWithData] = useState<number[]>([]);
  const [continent, setContinent] = useState("world");
  const geoLoaded = useRef(false);
  const geoFeaturesRef = useRef<any[]>([]);

  const categories = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string }>>();
    for (const ind of indicators) {
      if (!map.has(ind.category)) map.set(ind.category, []);
      map.get(ind.category)!.push({ id: ind.id, name: ind.name });
    }
    return [...map.entries()];
  }, [indicators]);

  const currIndicator = indicators.find((i) => i.id === selectedIndicator);
  const currentEvent = selectedYear ? HISTORICAL_EVENTS.find((e) => e.year === selectedYear) : null;
  const continentRegions = CONTINENTS.find((c) => c.key === continent)?.regions ?? [];

  useEffect(() => {
    if (geoLoaded.current) return;
    geoLoaded.current = true;
    const loadGeo = async () => {
      try {
        const res = await fetch("/world-110m.json");
        const topology = await res.json();
        const countries = feature(topology, topology.objects.countries) as any;
        // Drop Antarctica + features without an id so fitSize produces a
        // properly proportioned world map instead of a tall white strip.
        const plotted = countries.features.filter((f: any) => f.id && f.id !== "010");
        geoFeaturesRef.current = plotted;
        renderPaths(plotted);
      } catch {
        //
      }
    };
    loadGeo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Re-project country features with the current continent zoom, then
   *  recompute SVG paths + label positions. */
  const renderPaths = (features: any[], regionKey = continent) => {
    const currentRegions = CONTINENTS.find((c) => c.key === regionKey)?.regions ?? [];
    const filtered = currentRegions.length === 0
      ? features
      : features.filter((f: any) => {
          const iso3 = NUM_ID_TO_ISO3[f.id];
          if (!iso3) return false;
          const region = regions?.[iso3];
          return currentRegions.some((r) => region === r);
        });
    const projection = d3.geoMercator().fitSize([880, 420], { type: "FeatureCollection", features: filtered });
    const geoGenerator = d3.geoPath(projection);
    setPaths(
      filtered.map((f: any) => ({
        id: f.id,
        name: f.properties.name,
        path: geoGenerator(f) ?? "",
        label: (() => {
          const area = geoGenerator.area(f);
          if (area < 14) return null;
          const c = geoGenerator.centroid(f);
          return { x: c[0], y: c[1] };
        })(),
      }))
    );
  };

  const handleContinent = (key: string) => {
    setContinent(key);
    if (geoFeaturesRef.current.length > 0) renderPaths(geoFeaturesRef.current, key);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const yearParam = selectedYear ? `&year=${selectedYear}` : "";
        const res = await fetch(`/api/indicators/leaderboard?indicator=${selectedIndicator}&limit=250${yearParam}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          const rows = json.data ?? json.leaderboard ?? [];
          setData(new Map(rows.map((r: any) => [r.iso3 ?? r.country_iso3, r.value])));
          if (Array.isArray(json.years) && json.years.length > 0) {
            setYearsWithData(json.years);
          }
        }
      } catch {
        //
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedIndicator, selectedYear]);

  const vals = [...data.values()].filter((v) => v != null && !isNaN(v));
  const vMin = vals.length > 0 ? Math.min(...vals) : 0;
  const vMax = vals.length > 0 ? Math.max(...vals) : 1;
  const vRange = vMax - vMin || 1;

  const getColor = (id: string) => {
    const iso3 = NUM_ID_TO_ISO3[id];
    const v = iso3 ? data.get(iso3) : undefined;
    if (v == null || isNaN(v)) return "#f1f5f9";
    const t = Math.max(0, Math.min(1, (v - vMin) / vRange));
    return pastelColor(t);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>World map</span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedIndicator}
              onChange={(e) => { setSelectedIndicator(e.target.value); setSelectedYear(null); }}
              className="text-sm font-normal rounded-lg border border-input bg-transparent px-2 py-1 max-w-[260px]"
            >
              {categories.map(([cat, inds]) => (
                <optgroup key={cat} label={cat.replace(/_/g, " ")}>
                  {inds.map((ind) => (
                    <option key={ind.id} value={ind.id}>{ind.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              value={selectedYear ?? ""}
              onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
              className="text-sm font-normal rounded-lg border border-input bg-transparent px-2 py-1 w-[120px]"
            >
              <option value="">Latest</option>
              {yearsWithData.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={continent}
              onChange={(e) => handleContinent(e.target.value)}
              className="text-sm font-normal rounded-lg border border-input bg-transparent px-2 py-1"
            >
              {CONTINENTS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-sm font-normal cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="accent-amber-500"
              />
              Labels
            </label>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading map data...
          </div>
        )}
        {!loading && (
          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
              <svg viewBox="0 0 880 420" className="w-full h-auto" style={{ maxHeight: 400, display: "block" }}>
                <defs>
                  <linearGradient id="map-ocean" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#e0f2fe" />
                    <stop offset="60%" stopColor="#dbeafe" />
                    <stop offset="100%" stopColor="#f5f3ff" />
                  </linearGradient>
                </defs>
                <rect width="880" height="420" fill="url(#map-ocean)" />
                {paths.map(({ id, name, path }, idx) => {
                  const iso3 = NUM_ID_TO_ISO3[id];
                  if (!iso3) return <path key={`${id}-${idx}`} d={path || undefined} fill="#f8fafc" stroke="#fff" strokeWidth={0.6} />;
                  return (
                    <a key={`${id}-${idx}`} href={`/country/${iso3}`} className="cursor-pointer">
                      <path
                        d={path || undefined}
                        fill={getColor(id)}
                        stroke="#fff"
                        strokeWidth={0.6}
                        className="transition-opacity duration-150 hover:opacity-75"
                        onMouseEnter={() => {
                          const v = data.get(iso3);
                          setHovered({ name, value: v ?? null });
                        }}
                        onMouseLeave={() => setHovered(null)}
                      />
                    </a>
                  );
                })}
              {showLabels && paths.map(({ name, label }, idx) =>
                label ? (
                  <text
                    key={`lbl-${idx}`}
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    pointerEvents="none"
                    className="fill-foreground/80 select-none"
                    style={{ fontSize: 4.2, fontWeight: 600, paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 1.4, strokeLinejoin: "round" }}
                  >
                    {name}
                  </text>
                ) : null
              )}
              </svg>
            </div>
            {hovered && (
              <div className="absolute top-2 right-2 bg-card/95 backdrop-blur border rounded-lg px-3 py-1.5 text-sm shadow-sm pointer-events-none">
                <span className="font-semibold">{hovered.name}</span>
                {hovered.value != null && (
                  <span className="ml-2 text-muted-foreground tabular-nums">{fmtCompact(hovered.value)}</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="tabular-nums">{fmtCompact(vMin)}</span>
              <div className="relative flex-1 h-2.5 rounded-full" style={{ background: LEGEND_GRADIENT }}>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-px bg-white/80" />
              </div>
              <span className="tabular-nums">{fmtCompact(vMax)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currIndicator?.name ?? selectedIndicator} · {selectedYear ? `${selectedYear}` : "latest"} · {data.size} countries
              {continent !== "world" && ` · zoomed to ${CONTINENTS.find((c) => c.key === continent)?.label}`}
            </p>
            {currIndicator?.description && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{currIndicator.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-medium">How to read:</span>{" "}
              {isHigherBetter(selectedIndicator) ? "darker = higher value (better)" : "darker = higher value (worse)"}{" "}
              — grey = no data.
              {currIndicator?.unit && <> Unit: <span className="font-medium capitalize">{currIndicator.unit}</span>.</>}
            </p>
          </div>
        )}
        {currentEvent && (
          <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3 text-sm mt-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-amber-700">{currentEvent.label} ({currentEvent.year})</span>
            </div>
            <p className="text-amber-600 mt-1">{currentEvent.description}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-3 text-xs text-muted-foreground">
          {HISTORICAL_EVENTS.map((e) => (
            <button
              key={e.year}
              onClick={() => setSelectedYear(selectedYear === e.year ? null : e.year)}
              className={`px-2 py-0.5 rounded border transition-colors ${
                selectedYear === e.year
                  ? "bg-amber-100 border-amber-300 text-amber-800"
                  : "border-border hover:border-amber-300 hover:bg-amber-50"
              }`}
            >
              {e.year} {e.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
