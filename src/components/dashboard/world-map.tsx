"use client";

import { useState, useEffect, useRef } from "react";
import * as d3 from "d3-geo";
import { feature } from "topojson-client";

type Props = {
  indicatorId: string;
  indicatorName: string;
  unit: string;
  data: Array<{ iso3: string; value: number; year: number }>;
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

export function WorldMap({ indicatorName, unit, data }: Props) {
  const [paths, setPaths] = useState<{ id: string; name: string; path: string }[]>([]);
  const [hovered, setHovered] = useState<{ name: string; value: number | null } | null>(null);

  const values = new Map(data.map((d) => [d.iso3, d.value]));
  const vals = data.map((d) => d.value);
  const vMin = vals.length > 0 ? Math.min(...vals) : 0;
  const vMax = vals.length > 0 ? Math.max(...vals) : 1;
  const vRange = vMax - vMin || 1;

  const getColor = (iso3: string) => {
    const v = values.get(iso3);
    if (v == null || isNaN(v)) return "#e5e7eb";
    const t = Math.max(0, Math.min(1, (v - vMin) / vRange));
    const r = Math.round(255 * (1 - t * 0.8));
    const g = Math.round(200 + 55 * (1 - t * 0.4));
    const b = Math.round(200 + 55 * (1 - t));
    return `rgb(${r}, ${g}, ${b})`;
  };

  useEffect(() => {
    const loadGeo = async () => {
      try {
        const res = await fetch("/world-110m.json");
        const topology = await res.json();
        const countries = feature(topology, topology.objects.countries) as unknown as {
          type: "FeatureCollection";
          features: { type: "Feature"; id: string; properties: { name: string }; geometry: unknown }[];
        };
        const projection = d3.geoMercator().fitSize([800, 450], countries);
        const geoGenerator = d3.geoPath(projection);
        setPaths(
          countries.features.map((f) => ({
            id: f.id,
            name: f.properties.name,
            path: geoGenerator(f as any) ?? "",
          }))
        );
      } catch {
        //
      }
    };
    loadGeo();
  }, []);

  return (
    <div className="relative">
      <svg viewBox="0 0 800 450" className="w-full h-auto" style={{ maxHeight: 450 }}>
        {paths.map(({ id, name, path }) => (
          <path
            key={id}
            d={path || undefined}
            fill={getColor(GEO_ID_MAP[id] ?? id)}
            stroke="#fff"
            strokeWidth={0.5}
            className="transition-colors duration-150 hover:opacity-80 cursor-pointer"
            onMouseEnter={() => {
              const iso3 = GEO_ID_MAP[id] ?? id;
              const v = values.get(iso3);
              setHovered({ name, value: v ?? null });
            }}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      {hovered && (
        <div className="absolute bottom-2 left-2 bg-card border rounded-lg px-3 py-1.5 text-sm shadow-sm">
          <span className="font-medium">{hovered.name}</span>
          {hovered.value != null && (
            <span className="ml-2 text-muted-foreground">
              {hovered.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} {unit}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center mt-1 text-xs text-muted-foreground">
        <span>{vMin.toFixed(1)}</span>
        <div className="flex-1 mx-3 h-2 rounded-full" style={{
          background: "linear-gradient(to right, rgb(255, 210, 210), rgb(100, 150, 255))",
        }} />
        <span>{vMax.toFixed(1)}</span>
      </div>
    </div>
  );
}
