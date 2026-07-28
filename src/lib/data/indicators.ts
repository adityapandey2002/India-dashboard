/**
 * The Indicator Registry â€” the single source of truth for every metric
 * we track. Every scraper, API, and dashboard reads from this file.
 *
 * When we add a new indicator:
 *   1. Add it here (with the upstream source code, e.g. World Bank's id)
 *   2. Make sure the source is in src/lib/data/sources/<source>.ts
 *   3. Run the ingestion script â€” it auto-picks the right fetcher
 *
 * Schema per indicator:
 *   - id        : our internal id (used in URLs, DB)
 *   - name      : human-readable name shown in the UI
 *   - category  : one of the 10 categories in the challenge brief
 *   - source    : name of the data source (must match a fetcher)
 *   - sourceId  : the upstream API code
 *   - unit      : "USD", "%", "per 1000", "index" â€” for display
 *   - desc      : 1-line description for the tooltip
 *   - freq      : how often the source publishes
 */

import type { Indicator } from "@/lib/db/types";

type IndicatorSeed = Omit<Indicator, "updateFreq"> & { freq?: string };

export const INDICATORS: IndicatorSeed[] = [
  // â”€â”€ ðŸŒ Economy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: "gdp_current_usd",      name: "GDP (current US$)",            category: "economy",    source: "world_bank", sourceId: "NY.GDP.MKTP.CD",        unit: "USD",          description: "Total economic output in current US dollars", freq: "annual" },
  { id: "gdp_ppp_usd",          name: "GDP, PPP (current intl $)",    category: "economy",    source: "world_bank", sourceId: "NY.GDP.MKTP.PP.CD",     unit: "Intl $",       description: "GDP adjusted for purchasing power parity",      freq: "annual" },
  { id: "gdp_per_capita",       name: "GDP per capita",               category: "economy",    source: "world_bank", sourceId: "NY.GDP.PCAP.CD",        unit: "USD/person",   description: "GDP divided by population",                     freq: "annual" },
  { id: "gdp_growth_pct",       name: "GDP growth (annual %)",        category: "economy",    source: "world_bank", sourceId: "NY.GDP.MKTP.KD.ZG",     unit: "%",            description: "Year-over-year real GDP growth",                freq: "annual" },
  { id: "inflation_pct",        name: "Inflation, consumer prices",   category: "economy",    source: "world_bank", sourceId: "FP.CPI.TOTL.ZG",        unit: "%",            description: "Annual % change in consumer price index",       freq: "annual" },
  { id: "unemployment_pct",     name: "Unemployment, total",          category: "economy",    source: "world_bank", sourceId: "SL.UEM.TOTL.ZS",        unit: "%",            description: "Share of labour force without work",            freq: "annual" },
  { id: "public_debt_pct_gdp",  name: "Public debt (% of GDP)",       category: "economy",    source: "world_bank", sourceId: "GC.DOD.TOTL.GD.ZS",     unit: "%",            description: "Central government debt as % of GDP",            freq: "annual" },
  { id: "fdi_inflow_usd",       name: "Foreign direct investment, net", category: "economy",  source: "world_bank", sourceId: "BX.KLT.DINV.CD.WD",     unit: "USD",          description: "Net inflow of foreign direct investment",       freq: "annual" },
  { id: "logistics_perf_idx",   name: "Logistics Performance Index",  category: "economy",    source: "world_bank", sourceId: "LP.LPI.OVRL.XQ",        unit: "1â€“5",          description: "Quality of trade logistics (1=low, 5=high)",     freq: "biennial" },
  { id: "economic_freedom",     name: "Economic Freedom Index",       category: "economy",    source: "heritage",   sourceId: "ECONOMIC_FREEDOM",      unit: "0â€“100",        description: "Heritage Foundation index of economic freedom",  freq: "annual" },
  { id: "global_competitiveness", name: "Global Competitiveness Index", category: "economy",  source: "wef",        sourceId: "GCI",                    unit: "0â€“100",        description: "WEF measure of productivity & competitiveness", freq: "annual" },
  { id: "innovation_idx",       name: "Global Innovation Index",      category: "economy",    source: "wipo",       sourceId: "GII",                   unit: "0â€“100",        description: "WIPO innovation output + input score",          freq: "annual" },

  // â”€â”€ ðŸ‘¥ Society â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: "hdi",                  name: "Human Development Index",      category: "society",    source: "undp",       sourceId: "HDI",                   unit: "0â€“1",          description: "Composite of life expectancy, education, income", freq: "annual" },
  { id: "expected_yrs_school",  name: "Expected years of schooling",  category: "education",  source: "undp",       sourceId: "EYS",                   unit: "years",        description: "Number of years of schooling expected",          freq: "annual" },
  { id: "mean_yrs_school",      name: "Mean years of schooling",      category: "education",  source: "undp",       sourceId: "MYS",                   unit: "years",        description: "Average years of schooling for adults 25+",      freq: "annual" },
  { id: "gni_per_capita",       name: "GNI per capita (PPP " + String.fromCharCode(36) + ")",        category: "economy",    source: "undp",       sourceId: "GNIPC",                 unit: "Intl " + String.fromCharCode(36),       description: "Gross national income per capita in PPP dollars", freq: "annual" },
  { id: "ihdi",                 name: "Inequality-adjusted HDI",       category: "equality",   source: "undp",       sourceId: "IHDI",                  unit: "0–1",        description: "HDI discounted by inequality",                   freq: "annual" },
  { id: "gender_dev_idx",       name: "Gender Development Index",      category: "equality",   source: "undp",       sourceId: "GDI",                   unit: "0–1",        description: "Ratio of female to male HDI values",            freq: "annual" },
  { id: "population_total",     name: "Total population",              category: "society",    source: "undp",       sourceId: "POP",                   unit: "people",       description: "Total population",                              freq: "annual" },
  { id: "happiness_score",      name: "World Happiness Score",        category: "society",    source: "wef",        sourceId: "HAPPINESS",             unit: "0â€“10",         description: "Self-reported life evaluation (WHR)",            freq: "annual" },
  { id: "social_progress_idx",  name: "Social Progress Index",        category: "society",    source: "sspi",       sourceId: "SPI",                   unit: "0â€“100",        description: "Basic human needs + wellbeing of nations",       freq: "annual" },
  { id: "human_capital_idx",    name: "Human Capital Index",          category: "society",    source: "world_bank", sourceId: "HD.HCI.OVRL",            unit: "0â€“1",          description: "Knowledge + health + survival productivity",     freq: "annual" },
  { id: "multidim_poverty",     name: "Multidimensional Poverty",     category: "society",    source: "undp",       sourceId: "MPI",                   unit: "0â€“1",          description: "Share deprived in 1/3 of 10 indicators",         freq: "annual" },
  { id: "population_growth",    name: "Population growth (annual %)", category: "society",    source: "world_bank", sourceId: "SP.POP.GROW",            unit: "%",            description: "Year-over-year population change",               freq: "annual" },
  { id: "urbanization_pct",     name: "Urban population (%)",         category: "society",    source: "world_bank", sourceId: "SP.URB.TOTL.IN.ZS",     unit: "%",            description: "Share of population living in urban areas",      freq: "annual" },

  // â”€â”€ ðŸ› Governance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: "corruption_idx",       name: "Corruption Perceptions Index", category: "governance", source: "ti",         sourceId: "CPI",                   unit: "0â€“100",        description: "Perceived public-sector corruption (0=clean)",   freq: "annual" },
  { id: "democracy_idx",        name: "Democracy Index",              category: "governance", source: "ei",         sourceId: "DEMOCRACY",             unit: "0â€“10",         description: "Electoral process, pluralism, participation",    freq: "annual" },
  { id: "rule_of_law",          name: "Rule of Law Index",            category: "governance", source: "wjp",        sourceId: "ROL",                   unit: "0â€“1",          description: "WJP rule of law factor score",                   freq: "biennial" },
  { id: "press_freedom",        name: "Press Freedom Index",          category: "governance", source: "rsf",        sourceId: "PFI",                   unit: "rank",         description: "RSF press freedom ranking (lower=better)",       freq: "annual" },
  { id: "gov_effectiveness",    name: "Government Effectiveness",     category: "governance", source: "wgi", sourceId: "GE.EST",                 unit: "âˆ’2.5â€“2.5",     description: "Quality of public services & policy",             freq: "annual" },
  { id: "political_stability",  name: "Political Stability",          category: "governance", source: "wgi", sourceId: "PV.EST",                 unit: "âˆ’2.5â€“2.5",     description: "Likelihood of political instability",            freq: "annual" },
  { id: "regulatory_quality",   name: "Regulatory Quality",           category: "governance", source: "wgi", sourceId: "RQ.EST",                 unit: "âˆ’2.5â€“2.5",     description: "Ability of government to formulate policy",      freq: "annual" },
  { id: "voice_accountability", name: "Voice & Accountability",       category: "governance", source: "wgi", sourceId: "VA.EST",                 unit: "âˆ’2.5â€“2.5",     description: "Citizen participation in selecting govt",        freq: "annual" },
  { id: "control_corruption",   name: "Control of Corruption",       category: "governance", source: "wgi", sourceId: "CC.EST",                 unit: "\u22122.5\u20132.5",     description: "WGI control of corruption estimate",              freq: "annual" },
  { id: "open_budget",          name: "Open Budget Index",            category: "governance", source: "ibp",        sourceId: "OBI",                   unit: "0â€“100",        description: "Transparency of the national budget",            freq: "biennial" },

  // â”€â”€ ðŸ’» Technology & Innovation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: "ai_readiness",         name: "AI Readiness Index",           category: "technology", source: "oxford",     sourceId: "AIRI",                  unit: "0â€“100",        description: "Oxford Insights govt AI readiness",              freq: "annual" },
  { id: "network_readiness",    name: "Network Readiness Index",      category: "technology", source: "turtle",     sourceId: "NRI",                   unit: "0â€“100",        description: "Portulans Institute technology readiness",        freq: "annual" },
  { id: "cyber_security",       name: "Global Cybersecurity Index",   category: "technology", source: "itu",        sourceId: "GCI",                   unit: "0â€“100",        description: "ITU cyber security commitment score",            freq: "annual" },
  { id: "startup_ecosystem",    name: "Startup Ecosystem Ranking",    category: "technology", source: "startupblink", sourceId: "RANK",                unit: "rank",         description: "StartupBlink global ecosystem rank",             freq: "annual" },
  { id: "ict_development",      name: "ICT Development Index",        category: "technology", source: "itu",        sourceId: "IDI",                   unit: "0â€“10",         description: "ITU ICT access, use, skills level",               freq: "annual" },
  { id: "internet_penetration", name: "Internet users (% of pop)",    category: "technology", source: "world_bank", sourceId: "IT.NET.USER.ZS",        unit: "%",            description: "Share of population using the internet",         freq: "annual" },
  { id: "broadband_speed",      name: "Broadband speed (median)",     category: "technology", source: "ookla",      sourceId: "MEDIAN_MBPS",           unit: "Mbps",         description: "Median download speed (Ookla)",                  freq: "annual" },
  { id: "rd_expenditure",       name: "R&D expenditure (% GDP)",      category: "technology", source: "world_bank", sourceId: "GB.XPD.RSDV.GD.ZS",     unit: "%",            description: "Research & development spending as % of GDP",    freq: "annual" },
  { id: "patents_per_million",  name: "Patents per million people",   category: "technology", source: "wipo",       sourceId: "PATENTS_PM",            unit: "per million",  description: "Patent applications filed per million people",   freq: "annual" },
  { id: "patent_applications",  name: "Patent applications (residents)", category: "technology", source: "world_bank", sourceId: "IP.PAT.RESD",         unit: "count",        description: "Patent applications filed by residents at national patent office", freq: "annual" },
  { id: "mobile_subs",          name: "Mobile cellular subscriptions", category: "technology", source: "world_bank", sourceId: "IT.CEL.SETS.P2",       unit: "per 100",      description: "Mobile cellular subscriptions per 100 people",    freq: "annual" },

  // â”€â”€ ðŸŽ“ Education â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: "education_idx",        name: "Education Index",              category: "education",  source: "undp",       sourceId: "EDUCATION_IDX",         unit: "0â€“1",          description: "Mean years of schooling + expected years",        freq: "annual" },
  { id: "literacy_rate",        name: "Adult literacy rate",          category: "education",  source: "world_bank", sourceId: "SE.ADT.LITR.ZS",        unit: "%",            description: "% of adults (15+) who can read & write",         freq: "annual" },
  { id: "school_enrollment",    name: "School enrollment, secondary", category: "education",  source: "world_bank", sourceId: "SE.SEC.ENRR",           unit: "%",            description: "Gross secondary school enrollment ratio",        freq: "annual" },
  { id: "pisa_score",           name: "PISA score (avg)",             category: "education",  source: "oecd",       sourceId: "PISA",                  unit: "score",        description: "OECD PISA math/reading/science average",         freq: "triennial" },
  { id: "qs_rank",              name: "QS University Rank (avg top 5)", category: "education", source: "qs",         sourceId: "AVG_TOP5",              unit: "rank",         description: "Average rank of top-5 national universities",   freq: "annual" },
  { id: "student_teacher",      name: "Studentâ€“teacher ratio (primary)", category: "education", source: "world_bank", sourceId: "SE.PRM.ENRL.TC.ZS",  unit: "ratio",        description: "Pupils per teacher in primary school",           freq: "annual" },

  // â”€â”€ ðŸ¥ Healthcare â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: "healthcare_idx",       name: "Healthcare Index",             category: "healthcare", source: "numbeo",     sourceId: "HCI",                   unit: "0â€“100",        description: "Numbeo quality of healthcare system",            freq: "biennial" },
  { id: "uhc_idx",              name: "UHC Service Coverage Index",   category: "healthcare", source: "who",        sourceId: "UHC",                   unit: "0â€“100",        description: "WHO essential health services coverage",         freq: "annual" },
  { id: "haq_idx",              name: "Healthcare Access & Quality",  category: "healthcare", source: "ihme",       sourceId: "HAQ",                   unit: "0â€“100",        description: "IHME mortality amenable to healthcare",          freq: "annual" },
  { id: "life_expectancy",      name: "Life expectancy at birth",     category: "healthcare", source: "world_bank", sourceId: "SP.DYN.LE00.IN",        unit: "years",        description: "Years a newborn would live with current rates",  freq: "annual" },
  { id: "infant_mortality",     name: "Infant mortality rate",        category: "healthcare", source: "world_bank", sourceId: "SH.DYN.MORT",           unit: "per 1000",     description: "Deaths under age 1 per 1000 live births",        freq: "annual" },
  { id: "maternal_mortality",   name: "Maternal mortality ratio",     category: "healthcare", source: "world_bank", sourceId: "SH.STA.MMRT",           unit: "per 100k",     description: "Deaths per 100k live births",                    freq: "annual" },
  { id: "physicians_per_1k",    name: "Physicians per 1,000 people",  category: "healthcare", source: "world_bank", sourceId: "SH.MED.PHYS.ZS",        unit: "per 1000",     description: "Doctors per 1000 population",                    freq: "annual" },
  { id: "hospital_beds_per_1k", name: "Hospital beds per 1,000",      category: "healthcare", source: "world_bank", sourceId: "SH.MED.BEDS.ZS",        unit: "per 1000",     description: "Hospital beds per 1000 population",              freq: "annual" },
  { id: "vaccination_dpt",      name: "DPT vaccination coverage",     category: "healthcare", source: "world_bank", sourceId: "SH.IMM.IDPT",           unit: "%",            description: "% of 1-year-olds with DTP3 vaccine",             freq: "annual" },

  // â”€â”€ ðŸŒ± Environment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: "epi",                  name: "Environmental Performance Index", category: "environment", source: "yale",    sourceId: "EPI",                   unit: "0â€“100",        description: "Yale environmental health + ecosystem vitality", freq: "biennial" },
  { id: "ccpi",                 name: "Climate Change Performance Index", category: "environment", source: "germanwatch", sourceId: "CCPI",             unit: "0â€“100",        description: "Germanwatch climate protection ranking",         freq: "annual" },
  { id: "air_quality",          name: "Air quality (PM2.5 avg)",      category: "environment", source: "iqair",     sourceId: "PM25",                  unit: "Âµg/mÂ³",        description: "Average PM2.5 concentration",                    freq: "annual" },
  { id: "co2_per_capita",       name: "COâ‚‚ emissions per capita",     category: "environment", source: "owid", sourceId: "co2_per_capita",           unit: "tonnes",       description: "CO2 emissions per person (OWID)",                freq: "annual" },
  { id: "renewable_share",      name: "Renewable energy share",       category: "environment", source: "world_bank", sourceId: "EG.FEC.RNEW.ZS",        unit: "%",            description: "Renewables as % of total energy use",            freq: "annual" },
  { id: "forest_cover",         name: "Forest area (% of land)",      category: "environment", source: "world_bank", sourceId: "AG.LND.FRST.ZS",        unit: "%",            description: "Share of land covered by forest",                freq: "annual" },
  { id: "water_stress",         name: "Water stress (freshwater withdrawal)", category: "environment", source: "world_bank", sourceId: "ER.H2O.FWST.ZS", unit: "%",            description: "Freshwater withdrawal as % of renewable resources", freq: "annual" },
  { id: "electricity_access",   name: "Access to electricity",        category: "environment", source: "world_bank", sourceId: "EG.ELC.ACCS.ZS",       unit: "%",            description: "Share of population with access to electricity",  freq: "annual" },
  { id: "sdg_score",            name: "SDG Score (overall)",          category: "environment", source: "sdg",        sourceId: "SDG_SCORE",             unit: "0â€“100",        description: "SDG transformation score",                       freq: "annual" },

  // â”€â”€ ðŸ›¡ Safety â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: "global_peace",         name: "Global Peace Index",           category: "safety",     source: "iep",        sourceId: "GPI",                   unit: "1â€“5",          description: "IEP peacefulness score (lower=more peaceful)",   freq: "annual" },
  { id: "crime_idx",            name: "Crime Index",                  category: "safety",     source: "numbeo",     sourceId: "CRIME",                 unit: "0â€“100",        description: "Numbeo perceived crime level",                   freq: "biennial" },
  { id: "safety_idx",           name: "Safety Index",                 category: "safety",     source: "numbeo",     sourceId: "SAFETY",                unit: "0â€“100",        description: "Numbeo perceived safety level",                  freq: "biennial" },
  { id: "terrorism_idx",        name: "Terrorism Index",              category: "safety",     source: "gtd",        sourceId: "GTI",                   unit: "0â€“10",         description: "Global Terrorism Index impact score",            freq: "annual" },
  { id: "road_safety",          name: "Road traffic deaths (per 100k)", category: "safety",   source: "who",        sourceId: "RTD",                   unit: "per 100k",     description: "Estimated road traffic mortality",               freq: "annual" },
  { id: "disaster_risk",        name: "Disaster Risk Index",          category: "safety",     source: "inform",     sourceId: "INFORM",                unit: "0â€“10",         description: "INFORM disaster risk score",                     freq: "annual" },

  // â”€â”€ âš– Equality â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: "gender_gap",           name: "Global Gender Gap Index",      category: "equality",   source: "wef",        sourceId: "GGGI",                  unit: "0â€“1",          description: "Economic, education, health, political parity",  freq: "annual" },
  { id: "gender_inequality",    name: "Gender Inequality Index",      category: "equality",   source: "undp",       sourceId: "GII",                   unit: "0â€“1",          description: "UNDP reproductive health + empowerment",         freq: "annual" },
  { id: "gini",                 name: "Gini coefficient",             category: "equality",   source: "world_bank", sourceId: "SI.POV.GINI",           unit: "0â€“100",        description: "Income inequality (0=perfect equality)",         freq: "annual" },
  { id: "female_lfp",           name: "Female labour force participation", category: "equality", source: "world_bank", sourceId: "SL.TLF.CACT.FE.ZS", unit: "%",            description: "% of women aged 15+ in the labour force",        freq: "annual" },

  // â”€â”€ ðŸŒ Digital Government â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: "egov_idx",             name: "E-Government Development Index", category: "digital_gov", source: "un",       sourceId: "EGDI",                  unit: "0â€“1",          description: "UN online services + telecom + human capital",   freq: "biennial" },
  { id: "eparticipation",       name: "E-Participation Index",        category: "digital_gov", source: "un",         sourceId: "EPI",                   unit: "0â€“1",          description: "UN citizen engagement in e-gov services",        freq: "biennial" },
  { id: "govtech_maturity",     name: "GovTech Maturity Index",       category: "digital_gov", source: "wgi", sourceId: "GTMI",                  unit: "0â€“1",          description: "WB govtech support + adoption score",            freq: "annual" },
  { id: "open_data",            name: "Open Data Inventory",          category: "digital_gov", source: "od",         sourceId: "ODIN",                  unit: "0â€“100",        description: "Open Data Watch inventory score",                freq: "annual" },
  { id: "digital_competitiveness", name: "Digital Competitiveness Ranking", category: "digital_gov", source: "imd",   sourceId: "DCR",                   unit: "rank",         description: "IMD digital business + knowledge + tech readiness", freq: "annual" },
];

/**
 * Returns just the indicators that we have working scrapers for today.
 * As we add scrapers, this list grows. The UI uses this to know
 * which cards/links to show.
 */
export function getAvailableIndicators(): Indicator[] {
  // For now, all World Bank ones are available.
  return INDICATORS
    .filter((i) => isSourceReady(i.source))
    .map((i) => ({
      ...i,
      updateFreq: i.freq ?? null,
    }));
}

const READY_SOURCES = new Set(["world_bank", "undp", "who", "itu", "wipo", "owid", "wgi"]);

function isSourceReady(source: string): boolean {
  return READY_SOURCES.has(source);
}



