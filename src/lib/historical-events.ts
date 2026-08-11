/**
 * Historical events that explain India's indicator movements over time.
 * Each event carries a `source` (URL) so every claim is verifiable — the UI
 * renders "proof" links next to the event label.
 */

export type HistoricalEvent = {
  year: number;
  label: string;
  description: string;
  source: string;          // proof URL
  sourceLabel: string;     // e.g. "World Bank", "RBI"
  indicatorIds: string[];  // empty = relevant to all/economy indicators
};

export const INDIA_EVENTS: HistoricalEvent[] = [
  // ── Economy ──────────────────────────────────────────────
  {
    year: 1991,
    label: "Economic Liberalization",
    description: "India ended the License Raj, devalued the rupee, cut tariffs and opened to FDI — the start of sustained high GDP growth.",
    source: "https://www.worldbank.org/en/news/feature/2016/07/01/the-start-of-indias-economic-journey",
    sourceLabel: "World Bank",
    indicatorIds: ["gdp_current_usd", "gdp_growth_pct", "gdp_per_capita", "fdi_inflow_usd", "gdp_ppp_usd", "hdi", "gni_per_capita", "poverty_215"],
  },
  {
    year: 2003,
    label: "Fiscal Responsibility Act",
    description: "Fiscal Responsibility and Budget Management (FRBM) Act capped fiscal deficit, helping reduce public debt-to-GDP in the 2000s.",
    source: "https://www.indiabudget.gov.in/budget2023-24/bs/bsdoc/Chapter%20III%20FRBM%20Statement.pdf",
    sourceLabel: "Ministry of Finance, India",
    indicatorIds: ["public_debt_pct_gdp"],
  },
  {
    year: 2008,
    label: "Global Financial Crisis",
    description: "World trade collapsed after Lehman Brothers; India's GDP growth fell from ~9% to ~6% but stayed positive due to domestic demand.",
    source: "https://www.imf.org/external/pubs/ft/weo/2009/02/",
    sourceLabel: "IMF WEO 2009",
    indicatorIds: ["gdp_current_usd", "gdp_growth_pct", "unemployment_pct", "gdp_per_capita", "inflation_pct", "public_debt_pct_gdp"],
  },
  {
    year: 2014,
    label: "PM Modi elected",
    description: "Policy shift toward Make in India, GST (2017), IBC (2016), infrastructure push and foreign investment liberalization.",
    source: "https://www.niti.gov.in/",
    sourceLabel: "NITI Aayog",
    indicatorIds: ["gdp_current_usd", "gdp_growth_pct", "fdi_inflow_usd", "gdp_per_capita"],
  },
  {
    year: 2016,
    label: "Demonetization",
    description: "₹500/₹1000 notes (86% of cash) withdrawn — short-term GDP dip and cash crunch; accelerated digital payments adoption.",
    source: "https://www.rbi.org.in/Scripts/AnnualReportPublications.aspx?Id=1251",
    sourceLabel: "RBI Annual Report 2016-17",
    indicatorIds: ["gdp_current_usd", "gdp_growth_pct", "inflation_pct", "hdi", "gni_per_capita"],
  },
  {
    year: 2017,
    label: "GST Rollout",
    description: "One nation, one tax — unified indirect taxes; short-run disruption to growth, long-run boost to tax revenue and formalization.",
    source: "https://www.cbec.gov.in/htdocs-cbec/gst/index",
    sourceLabel: "CBIC (GST Council)",
    indicatorIds: ["gdp_growth_pct", "tax_revenue_pct", "gdp_current_usd"],
  },
  {
    year: 2020,
    label: "COVID-19 Pandemic",
    description: "Nationwide lockdown caused a 5.8% GDP contraction in FY2020-21 — the deepest in independent India's history; unemployment spiked.",
    source: "https://www.mospi.gov.in/sites/default/files/press_release/Press_Note_GDP_2020-21.pdf",
    sourceLabel: "MoSPI Press Note FY 2020-21",
    indicatorIds: ["gdp_current_usd", "gdp_growth_pct", "unemployment_pct", "inflation_pct", "public_debt_pct_gdp", "gdp_per_capita", "fdi_inflow_usd"],
  },
  {
    year: 2022,
    label: "Russia-Ukraine War Shock",
    description: "Commodity and oil price surge pushed inflation above 6% (RBI upper band) and pressured the rupee.",
    source: "https://www.rbi.org.in/scripts/PublicationsView.aspx?id=22032",
    sourceLabel: "RBI Monetary Policy Report 2022",
    indicatorIds: ["inflation_pct", "gdp_growth_pct"],
  },
  {
    year: 2005,
    label: "FDI Policy Liberalization",
    description: "FDI in most sectors moved to the automatic route (100% in many industries), driving the FDI boom of the mid-2000s.",
    source: "https://dpiit.gov.in/publications/fdi-policy",
    sourceLabel: "DPIIT, Govt. of India",
    indicatorIds: ["fdi_inflow_usd"],
  },

  // ── Technology ───────────────────────────────────────────
  {
    year: 2016,
    label: "Jio Launch (free data era)",
    description: "Reliance Jio launched free 4G data — internet penetration jumped from ~15% to 50%+ within 4 years; India became the world's #2 internet market.",
    source: "https://www.trai.gov.in/sites/default/files/PR_No.62of2022.pdf",
    sourceLabel: "TRAI Telecom Reports",
    indicatorIds: ["internet_penetration", "mobile_subs", "fixed_broadband", "trademark_applications", "cyber_security"],
  },
  {
    year: 2010,
    label: "Aadhaar Launch",
    description: "Biometric ID program began enrollment — foundation for digital government, Direct Benefit Transfers and India Stack.",
    source: "https://uidai.gov.in/",
    sourceLabel: "UIDAI",
    indicatorIds: ["egov_idx"],
  },
  {
    year: 2009,
    label: "UPI Begins Development",
    description: "NPCI began building UPI (launched 2016) — now processes >40% of global real-time digital payments.",
    source: "https://www.npci.org.in/what-we-do/upi/overview",
    sourceLabel: "NPCI",
    indicatorIds: ["internet_penetration", "egov_idx"],
  },
  {
    year: 2008,
    label: "DST New Policy & Nanotech Mission",
    description: "Science & Technology policy push plus increased R&D funding helped India's innovation climb in global indices.",
    source: "https://dst.gov.in/sites/default/files/NSTI-2013.pdf",
    sourceLabel: "DST, Govt. of India",
    indicatorIds: ["innovation_idx", "rd_expenditure", "patents_per_million", "patent_applications", "scientific_articles"],
  },

  // ── Governance ───────────────────────────────────────────
  {
    year: 2019,
    label: "Article 370 Revoked",
    description: "Special status of Jammu & Kashmir removed — international observers and democracy indices reacted differently to this change.",
    source: "https://www.v-dem.net/data/the-v-dem-dataset/",
    sourceLabel: "V-Dem Dataset",
    indicatorIds: ["democracy_idx", "political_stability"],
  },
  {
    year: 2021,
    label: "Digital Payments & DBT Surge",
    description: "JAM trinity (Jan Dhan-Aadhaar-Mobile) expanded Direct Benefit Transfers — anti-corruption and e-governance gains.",
    source: "https://dbtbharat.gov.in/",
    sourceLabel: "DBT Bharat, Govt. of India",
    indicatorIds: ["egov_idx", "corruption_idx", "gov_effectiveness"],
  },

  // ── Environment ──────────────────────────────────────────
  {
    year: 2015,
    label: "Paris Agreement Commitments",
    description: "India pledged 33-35% emissions intensity cut (by 2030) and 40% non-fossil power capacity — accelerated renewables deployment.",
    source: "https://unfccc.int/sites/default/files/resource/INDIA%20iNDC%20to%20the%20UNFCCC.pdf",
    sourceLabel: "UNFCCC (India's INDC)",
    indicatorIds: ["renewable_share", "renewable_electricity", "co2_per_capita", "co2_emissions_total", "fossil_fuel_energy"],
  },
  {
    year: 2019,
    label: "National Clean Air Programme",
    description: "NCAP launched with 20-30% PM2.5 reduction target for 122 non-attainment cities by 2024.",
    source: "https://moef.gov.in/wp-content/uploads/2019/01/NCAP.pdf",
    sourceLabel: "MoEFCC, Govt. of India",
    indicatorIds: ["air_quality"],
  },
  {
    year: 2006,
    label: "National Rural Employment Guarantee",
    description: "MGNREGA guaranteed 100 days of work — raised rural incomes, reduced poverty and boosted consumption.",
    source: "https://nrega.nic.in/Nregs/home.aspx",
    sourceLabel: "MGNREGA, Govt. of India",
    indicatorIds: ["poverty_215", "vulnerable_employment", "rural_population_pct", "gdp_growth_pct"],
  },
  {
    year: 2016,
    label: "Ujjwala LPG Scheme",
    description: "Free LPG connections for poor households — reduced indoor air pollution and health risks for millions.",
    source: "https://www.pmjdy.gov.in/",
    sourceLabel: "PMUY, Govt. of India",
    indicatorIds: ["air_quality", "life_expectancy", "undernourishment"],
  },

  // ── Healthcare ───────────────────────────────────────────
  {
    year: 2018,
    label: "Ayushman Bharat (PM-JAY)",
    description: "World's largest health insurance scheme — ₹5 lakh coverage for 100M+ poor families; boosted UHC coverage index.",
    source: "https://pmjay.gov.in/",
    sourceLabel: "PM-JAY, Govt. of India",
    indicatorIds: ["uhc_idx", "healthcare_idx", "maternal_mortality", "life_expectancy", "births_attended"],
  },
  {
    year: 2014,
    label: "Swachh Bharat Mission",
    description: "Massive sanitation campaign — built 100M+ toilets, cutting open defecation from ~550M people, improving child survival.",
    source: "https://swachhbharatmission.ddws.gov.in/",
    sourceLabel: "SBM, Govt. of India",
    indicatorIds: ["improved_sanitation", "improved_water", "infant_mortality", "undernourishment", "life_expectancy"],
  },
  {
    year: 2020,
    label: "COVID Vaccine Drive (Covaxin/Covishield)",
    description: "One of the world's largest vaccination campaigns — 2.2B doses by 2023, dramatically cutting COVID mortality.",
    source: "https://www.mohfw.gov.in/",
    sourceLabel: "MoHFW, Govt. of India",
    indicatorIds: ["vaccination_dpt", "life_expectancy", "healthcare_idx"],
  },

  // ── Education ────────────────────────────────────────────
  {
    year: 2009,
    label: "Right to Education Act",
    description: "Free compulsory education for ages 6-14 — boosted enrollment and literacy across India.",
    source: "https://www.education.gov.in/en/rte",
    sourceLabel: "Ministry of Education, India",
    indicatorIds: ["literacy_rate", "school_enrollment", "primary_completion", "education_idx", "student_teacher"],
  },
  {
    year: 2020,
    label: "National Education Policy",
    description: "NEP 2020 — first education overhaul in 34 years; focus on foundational literacy, vocational skills and research.",
    source: "https://www.education.gov.in/sites/upload_files/mhrd/files/NEP_Final_English_0.pdf",
    sourceLabel: "Ministry of Education, India",
    indicatorIds: ["education_idx", "literacy_rate", "qs_rank", "pisa_score", "hdi"],
  },

  // ── Equality / Society ───────────────────────────────────
  {
    year: 2005,
    label: "Right to Information Act",
    description: "RTI empowered citizens to hold government accountable — a milestone for transparency and voice.",
    source: "https://rti.gov.in/",
    sourceLabel: "RTI, Govt. of India",
    indicatorIds: ["voice_accountability", "corruption_idx", "open_budget"],
  },
  {
    year: 2017,
    label: "Triple Talaq Bill",
    description: "Criminalized instant divorce — a major gender-justice reform cited in gender equality reports.",
    source: "https://legislative.gov.in/actsofparliamentfromtheyear/muslim-women-protection-rights-marriage-act-2019",
    sourceLabel: "Legislative Dept., Govt. of India",
    indicatorIds: ["gender_gap", "gender_inequality", "female_lfp", "womens_economic_participation"],
  },
];

/** Events that apply to a given indicator (category fallback for economy-wide ones). */
export function eventsForIndicator(indicatorId: string, category?: string): HistoricalEvent[] {
  return INDIA_EVENTS.filter((e) =>
    e.indicatorIds.includes(indicatorId) ||
    (e.indicatorIds.length === 0 && category === "economy"),
  ).sort((a, b) => a.year - b.year);
}
