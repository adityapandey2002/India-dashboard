"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3-geo";
import { feature } from "topojson-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type Props = {
  indicators: Array<{ id: string; name: string; category: string }>;
};

const GEO_ID_MAP: Record<string, string> = {
  USA: "USA", CAN: "CAN", MEX: "MEX", BRA: "BRA", ARG: "ARG",
  GBR: "GBR", FRA: "FRA", DEU: "DEU", ITA: "ITA", ESP: "ESP",
  RUS: "RUS", CHN: "CHN", IND: "IND", JPN: "JPN", KOR: "KOR",
  AUS: "AUS", NZL: "NZL", ZAF: "ZAF", NGA: "NGA", EGY: "EGY",
  SAU: "SAU", TUR: "TUR", IRN: "IRN", IDN: "IDN", PAK: "PAK",
  BGD: "BGD", VNM: "VNM", THA: "THA", PHL: "PHL", MYS: "MYS",
  SWE: "SWE", NOR: "NOR", CHE: "CHE", NLD: "NLD", BEL: "BEL",
  AUT: "AUT", DNK: "DNK", FIN: "FIN", POL: "POL", UKR: "UKR",
  ROU: "ROU", CZE: "CZE", PRT: "PRT", GRC: "GRC", HUN: "HUN",
  ISR: "ISR", ARE: "ARE", QAT: "QAT", KWT: "KWT", SGP: "SGP",
  COL: "COL", CHL: "CHL", PER: "PER", VEN: "VEN", MAR: "MAR",
  DZA: "DZA", SDN: "SDN", KEN: "KEN", ETH: "ETH", TZA: "TZA",
  UGA: "UGA", GHA: "GHA", CMR: "CMR", CIV: "CIV", AGO: "AGO",
  MOZ: "MOZ", MDG: "MDG", MMR: "MMR", NPL: "NPL", LKA: "LKA",
  KHM: "KHM", LAO: "LAO", MNG: "MNG", PRK: "PRK", BLR: "BLR",
  KAZ: "KAZ", UZB: "UZB", TKM: "TKM", AFG: "AFG", IRQ: "IRQ",
  SYR: "SYR", YEM: "YEM", OMN: "OMN", JOR: "JOR", LBN: "LBN",
  GEO: "GEO", AZE: "AZE", ARM: "ARM", BGR: "BGR", SRB: "SRB",
  HRV: "HRV", BIH: "BIH", SVN: "SVN", SVK: "SVK", LTU: "LTU",
  LVA: "LVA", EST: "EST", ALB: "ALB", MKD: "MKD", MDA: "MDA",
  TUN: "TUN", LBY: "LBY", ERI: "ERI", SOM: "SOM", GIN: "GIN",
  SEN: "SEN", BFA: "BFA", MLI: "MLI", NER: "NER", TCD: "TCD",
  CAF: "CAF", COG: "COG", COD: "COD", GAB: "GAB", ZMB: "ZMB",
  ZWE: "ZWE", MWI: "MWI", BWA: "BWA", NAM: "NAM", LSO: "LSO",
  SWZ: "SWZ", TGO: "TGO", BEN: "BEN", SLE: "SLE", LBR: "LBR",
  MRT: "MRT", GMB: "GMB", GNB: "GNB", GNQ: "GNQ", RWA: "RWA",
  BDI: "BDI", SSD: "SSD", DJI: "DJI", COM: "COM", SYC: "SYC",
  MUS: "MUS", FJI: "FJI", PNG: "PNG", SLB: "SLB", VUT: "VUT",
  WSM: "WSM", TON: "TON", KIR: "KIR", FSM: "FSM", MHL: "MHL",
  PLW: "PLW", TUV: "TUV", NCL: "NCL", PYF: "PYF", GUM: "GUM",
  ASM: "ASM", PRI: "PRI", GRL: "GRL", CUB: "CUB", JAM: "JAM",
  HTI: "HTI", DOM: "DOM", BHS: "BHS", BRB: "BRB", TTO: "TTO",
  VCT: "VCT", LCA: "LCA", DMA: "DMA", GRD: "GRD", KNA: "KNA",
  ATG: "ATG", BLZ: "BLZ", GUY: "GUY", SUR: "SUR", CPV: "CPV",
  STP: "STP", MDV: "MDV", BRN: "BRN", TLS: "TLS", MNE: "MNE",
  SMR: "SMR", LIE: "LIE", AND: "AND", MCO: "MCO", MLT: "MLT",
  MAC: "MAC", TWN: "TWN", PSE: "PSE",
};

const HISTORICAL_EVENTS = [
  { year: 2020, label: "COVID-19", description: "Global pandemic caused economic contraction, supply chain disruption, and accelerated digital adoption worldwide." },
  { year: 2016, label: "Demonetization", description: "India withdrew ₹500/₹1000 notes (86% of cash), causing short-term GDP dip and accelerated digital payments." },
  { year: 2014, label: "PM Modi elected", description: "Policy shift toward Make in India, GST (2017), IBC (2016), infrastructure push." },
  { year: 2008, label: "Global Financial Crisis", description: "World trade collapsed; India relatively resilient due to domestic demand and limited financial exposure." },
  { year: 2004, label: "Tsunami", description: "Indian Ocean tsunami impacted coastal economies; massive reconstruction spending followed." },
  { year: 1991, label: "Economic Liberalization", description: "India ended License Raj, opened to FDI, devalued rupee — foundation of modern growth trajectory." },
];

export function WorldMapCard({ indicators }: Props) {
  const [selectedIndicator, setSelectedIndicator] = useState("gdp_current_usd");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [data, setData] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [paths, setPaths] = useState<{ id: string; name: string; path: string }[]>([]);
  const [hovered, setHovered] = useState<{ name: string; value: number | null } | null>(null);
  const geoLoaded = useRef(false);

  const currIndicator = indicators.find((i) => i.id === selectedIndicator);
  const currentEvent = selectedYear ? HISTORICAL_EVENTS.find((e) => e.year === selectedYear) : null;

  useEffect(() => {
    if (geoLoaded.current) return;
    geoLoaded.current = true;
    const loadGeo = async () => {
      try {
        const res = await fetch("/world-110m.json");
        const topology = await res.json();
        const countries = feature(topology, topology.objects.countries) as any;
        const projection = d3.geoMercator().fitSize([800, 450], countries);
        const geoGenerator = d3.geoPath(projection);
        setPaths(
          countries.features.map((f: any) => ({
            id: f.id,
            name: f.properties.name,
            path: geoGenerator(f) ?? "",
          }))
        );
      } catch {
        //
      }
    };
    loadGeo();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const yearParam = selectedYear ? `&year=${selectedYear}` : "";
        const res = await fetch(`/api/indicators/leaderboard?indicator=${selectedIndicator}&limit=250${yearParam}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.leaderboard) {
          setData(new Map(json.leaderboard.map((r: any) => [r.iso3, r.value])));
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
    const v = data.get(GEO_ID_MAP[id] ?? id);
    if (v == null || isNaN(v)) return "#e5e7eb";
    const t = Math.max(0, Math.min(1, (v - vMin) / vRange));
    const r = Math.round(255 * (1 - t * 0.8));
    const g = Math.round(200 + 55 * (1 - t * 0.4));
    const b = Math.round(200 + 55 * (1 - t));
    return `rgb(${r}, ${g}, ${b})`;
  };

  const yearsWithData = useMemo(() => {
    // This would ideally come from an API call to get available years
    // For now, we'll show a range
    return Array.from({ length: 15 }, (_, i) => 2024 - i);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>World map</span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedIndicator}
              onChange={(e) => { setSelectedIndicator(e.target.value); setSelectedYear(null); }}
              className="text-sm font-normal rounded-lg border border-input bg-transparent px-2 py-1 max-w-[240px]"
            >
              {indicators.map((ind) => (
                <option key={ind.id} value={ind.id}>{ind.name}</option>
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
            <svg viewBox="0 0 800 450" className="w-full h-auto" style={{ maxHeight: 400 }}>
              {paths.map(({ id, name, path }, idx) => (
                <path
                  key={`${id}-${idx}`}
                  d={path || undefined}
                  fill={getColor(id)}
                  stroke="#fff"
                  strokeWidth={0.5}
                  className="transition-colors duration-150 hover:opacity-80 cursor-pointer"
                  onMouseEnter={() => {
                    const v = data.get(GEO_ID_MAP[id] ?? id);
                    setHovered({ name, value: v ?? null });
                  }}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </svg>
            {hovered && (
              <div className="absolute bottom-2 left-2 bg-card border rounded-lg px-3 py-1.5 text-sm shadow-sm pointer-events-none">
                <span className="font-medium">{hovered.name}</span>
                {hovered.value != null && (
                  <span className="ml-2 text-muted-foreground">{hovered.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                )}
              </div>
            )}
            <div className="flex items-center mt-1 text-xs text-muted-foreground">
              <span className="tabular-nums">{vMin.toFixed(1)}</span>
              <div className="flex-1 mx-3 h-2 rounded-full" style={{
                background: "linear-gradient(to right, rgb(255, 210, 210), rgb(100, 150, 255))",
              }} />
              <span className="tabular-nums">{vMax.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currIndicator?.name ?? selectedIndicator} · {selectedYear ? `${selectedYear}` : "latest"} · {data.size} countries
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