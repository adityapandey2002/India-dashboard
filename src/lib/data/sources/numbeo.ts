/**
 * Numbeo indicator scraper.
 * Fetches Health Care, Crime, and Safety indices from Numbeo ranking pages.
 */

export type NumbeoDataPoint = {
  iso3: string;
  indicatorId: string;
  year: number;
  value: number;
};

const NUMBEO_BASE = "https://www.numbeo.com";
const YEAR = new Date().getFullYear();

/** Map Numbeo country names to ISO3 codes */
function countryToIso3(name: string): string | null {
  const map: Record<string, string> = {
    "india": "IND", "china": "CHN", "united states": "USA", "usa": "USA",
    "brazil": "BRA", "japan": "JPN", "germany": "DEU", "france": "FRA",
    "united kingdom": "GBR", "uk": "GBR", "russia": "RUS", "canada": "CAN",
    "australia": "AUS", "mexico": "MEX", "indonesia": "IDN", "turkey": "TUR",
    "south korea": "KOR", "italy": "ITA", "spain": "ESP", "argentina": "ARG",
    "sweden": "SWE", "norway": "NOR", "netherlands": "NLD", "singapore": "SGP",
    "bangladesh": "BGD", "pakistan": "PAK", "sri lanka": "LKA", "nepal": "NPL",
    "bhutan": "BTN", "south africa": "ZAF", "saudi arabia": "SAU",
    "switzerland": "CHE", "poland": "POL", "belgium": "BEL", "austria": "AUT",
    "israel": "ISR", "egypt": "EGY", "nigeria": "NGA", "kenya": "KEN",
    "ethiopia": "ETH", "vietnam": "VNM", "thailand": "THA", "malaysia": "MYS",
    "philippines": "PHL", "new zealand": "NZL", "chile": "CHL", "colombia": "COL",
    "peru": "PER", "ukraine": "UKR", "romania": "ROU", "czech republic": "CZE",
    "portugal": "PRT", "greece": "GRC", "hungary": "HUN", "denmark": "DNK",
    "finland": "FIN", "ireland": "IRL", "morocco": "MAR", "algeria": "DZA",
    "tunisia": "TUN", "ghana": "GHA", "tanzania": "TZA", "uganda": "UGA",
    "congo": "COD", "cameroon": "CMR", "ivory coast": "CIV", "sudan": "SDN",
    "yemen": "YEM", "jordan": "JOR", "lebanon": "LBN", "qatar": "QAT",
    "kuwait": "KWT", "oman": "OMN", "bahrain": "BHR", "united arab emirates": "ARE",
    "bolivia": "BOL", "uruguay": "URY", "paraguay": "PRY", "venezuela": "VEN",
    "costa rica": "CRI", "panama": "PAN", "guatemala": "GTM", "cuba": "CUB",
    "dominican republic": "DOM", "haiti": "HTI", "honduras": "HND",
    "el salvador": "SLV", "nicaragua": "NIC", "myanmar": "MMR",
    "cambodia": "KHM", "laos": "LAO", "mongolia": "MNG", "kazakhstan": "KAZ",
    "uzbekistan": "UZB", "azerbaijan": "AZE", "georgia": "GEO",
    "croatia": "HRV", "serbia": "SRB", "bulgaria": "BGR", "slovakia": "SVK",
    "slovenia": "SVN", "lithuania": "LTU", "latvia": "LVA", "estonia": "EST",
    "cyprus": "CYP", "luxembourg": "LUX", "malta": "MLT", "iceland": "ISL",
    "afghanistan": "AFG", "iran": "IRN", "iraq": "IRQ", "syria": "SYR",
    "libya": "LBY", "somalia": "SOM", "angola": "AGO", "mozambique": "MOZ",
    "zambia": "ZMB", "zimbabwe": "ZWE", "malawi": "MWI", "madagascar": "MDG",
    "rwanda": "RWA", "burundi": "BDI", "south sudan": "SSD", "chad": "TCD",
    "niger": "NER", "mali": "MLI", "burkina faso": "BFA", "senegal": "SEN",
    "benin": "BEN", "togo": "TGO", "sierra leone": "SLE", "liberia": "LBR",
    "mauritania": "MRT", "gambia": "GMB", "guinea": "GIN", "guinea-bissau": "GNB",
    "equatorial guinea": "GNQ", "gabon": "GAB", "botswana": "BWA",
    "namibia": "NAM", "lesotho": "LSO", "swaziland": "SWZ",
    "fiji": "FJI", "papua new guinea": "PNG",
    "trinidad and tobago": "TTO", "jamaica": "JAM", "bahamas": "BHS",
    "barbados": "BRB", "mauritius": "MUS", "north macedonia": "MKD",
    "moldova": "MDA", "armenia": "ARM", "albania": "ALB", "belarus": "BLR",
    "bosnia and herzegovina": "BIH", "montenegro": "MNE",
    "hong kong": "HKG", "taiwan": "TWN", "macau": "MAC",
    "puerto rico": "PRI", "palestine": "PSE",
  };
  return map[name.trim().toLowerCase()] ?? null;
}

function parseTableRows(html: string): string[][] {
  const tableStart = html.indexOf('<table id="t2"');
  if (tableStart < 0) return [];
  const tableSection = html.slice(tableStart, tableStart + 100000);

  const rows: string[][] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let match;
  while ((match = rowRegex.exec(tableSection)) !== null) {
    const tds = match[1].match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (tds) {
      const cells = tds.map((td) => td.replace(/<[^>]+>/g, "").trim());
      if (cells.length >= 2) rows.push(cells);
    }
  }
  return rows;
}

async function scrapePage(url: string, columnIdx: number, indicatorId: string): Promise<NumbeoDataPoint[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];

  const html = await res.text();
  const rows = parseTableRows(html);
  const points: NumbeoDataPoint[] = [];

  for (const cells of rows) {
    const countryName = cells[1];
    const rawVal = cells[columnIdx];
    if (!countryName || !rawVal) continue;

    const iso3 = countryToIso3(countryName);
    if (!iso3) continue;

    const val = parseFloat(rawVal);
    if (isNaN(val)) continue;

    points.push({ iso3, indicatorId, year: YEAR, value: val });
  }

  return points;
}

export async function fetchNumbeoIndices(): Promise<NumbeoDataPoint[]> {
  const results = await Promise.allSettled([
    // Health Care page: column 2 = "Health Care Index"
    scrapePage(`${NUMBEO_BASE}/health-care/rankings_by_country.jsp?title=${YEAR}`, 2, "healthcare_idx"),
    // Crime page: column 2 = "Crime Index"
    scrapePage(`${NUMBEO_BASE}/crime/rankings_by_country.jsp?title=${YEAR}`, 2, "crime_idx"),
    // Quality of Life page: column 4 = "Safety Index"
    scrapePage(`${NUMBEO_BASE}/quality-of-life/rankings_by_country.jsp?title=${YEAR}`, 4, "safety_idx"),
  ]);

  const all: NumbeoDataPoint[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  return all;
}
