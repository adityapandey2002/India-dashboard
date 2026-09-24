export type CriticalPage = { path: string; name: string };

/** URLs exercised by both the flows spec and the health spec. */
export const CRITICAL_PATHS: CriticalPage[] = [
  { path: "/", name: "Home" },
  { path: "/explore", name: "Explore" },
  { path: "/compare", name: "Compare" },
  { path: "/indicator/ai_readiness", name: "Indicator (ai_readiness)" },
  { path: "/indicator/infant_mortality", name: "Indicator (infant_mortality)" },
  { path: "/country/IND", name: "Country (IND)" },
  { path: "/rankings", name: "Rankings" },
  { path: "/report-card", name: "Report card" },
];