/**
 * Fetcher for UN E-Government Development Index and E-Participation Index.
 * Uses data from the UN public data portal via a known CSV mirror.
 */

export type UnDataPoint = {
  iso3: string;
  indicatorId: string;
  year: number;
  value: number;
};

const KNOWN_ISO = new Set([
  "ARE","ARG","AUS","AUT","BEL","BGD","BGR","BHR","BHS","BIH","BLR","BOL",
  "BRA","BRN","BTN","BWA","CAN","CHE","CHL","CHN","CIV","CMR","COD","COG",
  "COL","COM","CPV","CRI","CUB","CYP","CZE","DEU","DNK","DOM","DZA","ECU",
  "EGY","ESP","EST","ETH","FIN","FRA","GAB","GBR","GEO","GHA","GIN","GMB",
  "GNB","GNQ","GRC","GTM","GUY","HKG","HND","HRV","HTI","HUN","IDN","IND",
  "IRL","IRN","IRQ","ISL","ISR","ITA","JAM","JOR","JPN","KAZ","KEN","KGZ",
  "KHM","KIR","KOR","KWT","LAO","LBN","LBR","LBY","LKA","LSO","LTU","LUX",
  "LVA","MAC","MAR","MDA","MDG","MDV","MEX","MKD","MLI","MLT","MMR","MNE",
  "MNG","MOZ","MRT","MUS","MWI","MYS","NAM","NER","NGA","NIC","NLD","NOR",
  "NPL","NZL","OMN","PAK","PAN","PER","PHL","PLW","PNG","POL","PRI","PRT",
  "PRY","QAT","ROU","RUS","RWA","SAU","SDN","SEN","SGP","SLB","SLE","SLV",
  "SMR","SRB","SSD","STP","SUR","SVK","SVN","SWE","SWZ","SYC","SYR","TCD",
  "TGO","THA","TJK","TKM","TLS","TON","TTO","TUN","TUR","TUV","TWN","TZA",
  "UGA","UKR","URY","USA","UZB","VCT","VEN","VNM","VUT","WSM","YEM","ZAF",
  "ZMB","ZWE",
]);

/** Try multiple known WB API codes for EGDI and E-Participation */
const EGOV_CODES: Record<string, string> = {
  "SG.ODI.INTL.EC.XQ": "egov_idx",
  "SG.GOV.ELEC": "egov_idx",
  "UN.OGDI.EST": "egov_idx",
};

const EPARTICIPATION_CODES: Record<string, string> = {
  "SG.ODI.INTL.PC.XQ": "eparticipation",
  "UN.OGDI.EPT": "eparticipation",
  "SG.GOV.PART": "eparticipation",
};

async function fetchWbSeries(codes: Record<string, string>, fromYear = 2010): Promise<UnDataPoint[]> {
  const points: UnDataPoint[] = [];

  for (const [wbCode, indicatorId] of Object.entries(codes)) {
    const url = `https://api.worldbank.org/v2/country/all/indicator/${wbCode}?format=json&per_page=5000&date=${fromYear}:2025`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "IndiaDashboard/0.1" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;

      const json = await res.json();
      if (!Array.isArray(json) || json.length < 2) continue;

      const records = json[1] as Array<{ countryiso3code: string; date: string; value: number | null }>;
      if (!Array.isArray(records) || records.length === 0) continue;

      let count = 0;
      for (const r of records) {
        if (r?.value == null) continue;
        const iso3 = r.countryiso3code?.toUpperCase();
        if (!iso3 || !KNOWN_ISO.has(iso3)) continue;
        const year = parseInt(r?.date, 10);
        if (isNaN(year)) continue;
        points.push({ iso3, indicatorId, year, value: r.value });
        count++;
      }
      if (count > 0) break; // found working code, skip remaining
    } catch {
      continue;
    }
  }

  return points;
}

export async function fetchUnEGov(): Promise<UnDataPoint[]> {
  const [egdi, epart] = await Promise.all([
    fetchWbSeries(EGOV_CODES),
    fetchWbSeries(EPARTICIPATION_CODES),
  ]);
  return [...egdi, ...epart];
}
