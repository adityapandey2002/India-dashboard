import type { Indicator } from "@/lib/db/types";

type IndicatorSeed = Omit<Indicator, "updateFreq"> & { freq?: string };

export const INDICATORS: IndicatorSeed[] = [

  // Economy
  { id: "gdp_current_usd",      name: "GDP (current US$)",            category: "economy",    source: "world_bank", sourceId: "NY.GDP.MKTP.CD",        unit: "USD",          description: "Total economic output in current US dollars", freq: "annual" },
  { id: "gdp_ppp_usd",          name: "GDP, PPP (current intl $)",    category: "economy",    source: "world_bank", sourceId: "NY.GDP.MKTP.PP.CD",     unit: "Intl $",       description: "GDP adjusted for purchasing power parity",      freq: "annual" },
  { id: "gdp_per_capita",       name: "GDP per capita",               category: "economy",    source: "world_bank", sourceId: "NY.GDP.PCAP.CD",        unit: "USD/person",   description: "GDP divided by population",                     freq: "annual" },
  { id: "gdp_growth_pct",       name: "GDP growth (annual %)",        category: "economy",    source: "world_bank", sourceId: "NY.GDP.MKTP.KD.ZG",     unit: "%",            description: "Year-over-year real GDP growth",                freq: "annual" },
  { id: "inflation_pct",        name: "Inflation, consumer prices",   category: "economy",    source: "world_bank", sourceId: "FP.CPI.TOTL.ZG",        unit: "%",            description: "Annual % change in consumer price index",       freq: "annual" },
  { id: "unemployment_pct",     name: "Unemployment, total",          category: "economy",    source: "world_bank", sourceId: "SL.UEM.TOTL.ZS",        unit: "%",            description: "Share of labour force without work",            freq: "annual" },
  { id: "public_debt_pct_gdp",  name: "Public debt (% of GDP)",       category: "economy",    source: "world_bank", sourceId: "GC.DOD.TOTL.GD.ZS",     unit: "%",            description: "Central government debt as % of GDP",            freq: "annual" },
  { id: "fdi_inflow_usd",       name: "Foreign direct investment, net", category: "economy",  source: "world_bank", sourceId: "BX.KLT.DINV.CD.WD",     unit: "USD",          description: "Net inflow of foreign direct investment",       freq: "annual" },
  { id: "logistics_perf_idx",   name: "Logistics Performance Index",  category: "economy",    source: "world_bank", sourceId: "LP.LPI.OVRL.XQ",        unit: "1-5",          description: "Quality of trade logistics (1=low, 5=high)",     freq: "biennial" },
  { id: "economic_freedom",     name: "Economic Freedom Index",       category: "economy",    source: "heritage",   sourceId: "ECONOMIC_FREEDOM",      unit: "0-100",        description: "Heritage Foundation index of economic freedom",  freq: "annual" },
  { id: "global_competitiveness", name: "Global Competitiveness Index", category: "economy",  source: "wef",        sourceId: "GCI",                    unit: "0-100",        description: "WEF measure of productivity & competitiveness", freq: "annual" },
  { id: "trade_pct_gdp",        name: "Trade (% of GDP)",             category: "economy",    source: "world_bank", sourceId: "TG.VAL.TOTL.GD.ZS",     unit: "%",            description: "Total trade (exports + imports) as share of GDP", freq: "annual" },
  { id: "self_employed",        name: "Self-employed (% of employment)", category: "economy", source: "world_bank", sourceId: "SL.EMP.SELF.ZS",       unit: "%",            description: "Own-account workers and employers",              freq: "annual" },
  { id: "agriculture_value_added", name: "Agriculture, value added (% GDP)", category: "economy", source: "world_bank", sourceId: "NV.AGR.TOTL.ZS",     unit: "%",            description: "Agriculture as share of GDP",                    freq: "annual" },
  { id: "industry_value_added", name: "Industry, value added (% GDP)",    category: "economy",    source: "world_bank", sourceId: "NV.IND.TOTL.ZS",        unit: "%",            description: "Industry as share of GDP",                       freq: "annual" },
  { id: "services_value_added", name: "Services, value added (% GDP)",    category: "economy",    source: "world_bank", sourceId: "NV.SRV.TOTL.ZS",        unit: "%",            description: "Services as share of GDP",                       freq: "annual" },
  { id: "exports_pct_gdp",      name: "Exports of goods & services (% GDP)", category: "economy", source: "world_bank", sourceId: "NE.EXP.GNFS.ZS",     unit: "%",            description: "Total exports as share of GDP",                  freq: "annual" },
  { id: "gross_savings_pct",    name: "Gross savings (% GDP)",            category: "economy",    source: "world_bank", sourceId: "NY.GNS.ICTR.ZS",        unit: "%",            description: "Gross national savings as share of GDP",          freq: "annual" },
  { id: "tax_revenue_pct",      name: "Tax revenue (% GDP)",              category: "economy",    source: "world_bank", sourceId: "GC.TAX.TOTL.GD.ZS",     unit: "%",            description: "Total tax revenue as share of GDP",              freq: "annual" },

  // Society
  { id: "hdi",                  name: "Human Development Index",      category: "society",    source: "undp",       sourceId: "HDI",                   unit: "0-1",          description: "Composite of life expectancy, education, income", freq: "annual" },
  { id: "expected_yrs_school",  name: "Expected years of schooling",  category: "education",  source: "undp",       sourceId: "EYS",                   unit: "years",        description: "Number of years of schooling expected",          freq: "annual" },
  { id: "mean_yrs_school",      name: "Mean years of schooling",      category: "education",  source: "undp",       sourceId: "MYS",                   unit: "years",        description: "Average years of schooling for adults 25+",      freq: "annual" },
  { id: "gni_per_capita",       name: "GNI per capita (PPP " + String.fromCharCode(36) + ")",        category: "economy",    source: "undp",       sourceId: "GNIPC",                 unit: "Intl " + String.fromCharCode(36),       description: "Gross national income per capita in PPP dollars", freq: "annual" },
  { id: "ihdi",                 name: "Inequality-adjusted HDI",       category: "equality",   source: "undp",       sourceId: "IHDI",                  unit: "0-1",        description: "HDI discounted by inequality",                   freq: "annual" },
  { id: "gender_dev_idx",       name: "Gender Development Index",      category: "equality",   source: "undp",       sourceId: "GDI",                   unit: "0-1",        description: "Ratio of female to male HDI values",            freq: "annual" },
  { id: "population_total",     name: "Total population",              category: "society",    source: "undp",       sourceId: "POP",                   unit: "people",       description: "Total population",                              freq: "annual" },
  { id: "happiness_score",      name: "World Happiness Score",        category: "society",    source: "wef",        sourceId: "HAPPINESS",             unit: "0-10",         description: "Self-reported life evaluation (WHR)",            freq: "annual" },
  { id: "social_progress_idx",  name: "Social Progress Index",        category: "society",    source: "sspi",       sourceId: "SPI",                   unit: "0-100",        description: "Basic human needs + wellbeing of nations",       freq: "annual" },
  { id: "human_capital_idx",    name: "Human Capital Index",          category: "society",    source: "world_bank", sourceId: "HD.HCI.OVRL",            unit: "0-1",          description: "Knowledge + health + survival productivity",     freq: "annual" },
  { id: "multidim_poverty",     name: "Multidimensional Poverty",     category: "society",    source: "undp",       sourceId: "MPI",                   unit: "0-1",          description: "Share deprived in 1/3 of 10 indicators",         freq: "annual" },
  { id: "population_growth",    name: "Population growth (annual %)", category: "society",    source: "world_bank", sourceId: "SP.POP.GROW",            unit: "%",            description: "Year-over-year population change",               freq: "annual" },
  { id: "urbanization_pct",     name: "Urban population (%)",         category: "society",    source: "world_bank", sourceId: "SP.URB.TOTL.IN.ZS",     unit: "%",            description: "Share of population living in urban areas",      freq: "annual" },
  { id: "age_dependency",       name: "Age dependency ratio",         category: "society",    source: "world_bank", sourceId: "SP.POP.DPND",            unit: "%",            description: "Dependents as % of working-age population",     freq: "annual" },
  { id: "net_migration",        name: "Net migration",                category: "society",    source: "world_bank", sourceId: "SM.POP.NETM",            unit: "people",       description: "Net number of migrants",                        freq: "annual" },
  { id: "population_density",   name: "Population density",           category: "society",    source: "world_bank", sourceId: "EN.POP.DNST",            unit: "per sq km",    description: "People per square kilometer of land area",       freq: "annual" },
  { id: "rural_population_pct", name: "Rural population (% of total)", category: "society",   source: "world_bank", sourceId: "SP.RUR.TOTL.ZS",        unit: "%",            description: "Share of population living in rural areas",      freq: "annual" },
  { id: "refugee_population",   name: "Refugee population",           category: "society",    source: "world_bank", sourceId: "SM.POP.REFG",            unit: "people",       description: "Population of refugees by country of asylum",     freq: "annual" },
  { id: "labor_force_participation", name: "Labor force participation rate", category: "society", source: "world_bank", sourceId: "SL.TLF.CACT.ZS",   unit: "%",            description: "Share of population ages 15+ in labor force",     freq: "annual" },

  // Governance
  { id: "corruption_idx",       name: "Corruption Perceptions Index", category: "governance", source: "ti",         sourceId: "CPI",                   unit: "0-100",        description: "Perceived public-sector corruption (0=clean)",   freq: "annual" },
  { id: "democracy_idx",        name: "Democracy Index",              category: "governance", source: "ei",         sourceId: "DEMOCRACY",             unit: "0-10",         description: "Electoral process, pluralism, participation",    freq: "annual" },
  { id: "rule_of_law",          name: "Rule of Law Index",            category: "governance", source: "wjp",        sourceId: "ROL",                   unit: "0-1",          description: "WJP rule of law factor score",                   freq: "biennial" },
  { id: "press_freedom",        name: "Press Freedom Index",          category: "governance", source: "rsf",        sourceId: "PFI",                   unit: "rank",         description: "RSF press freedom ranking (lower=better)",       freq: "annual" },
  { id: "gov_effectiveness",    name: "Government Effectiveness",     category: "governance", source: "wgi", sourceId: "GE.EST",                 unit: "-2.5-2.5",     description: "Quality of public services & policy",             freq: "annual" },
  { id: "political_stability",  name: "Political Stability",          category: "governance", source: "wgi", sourceId: "PV.EST",                 unit: "-2.5-2.5",     description: "Likelihood of political instability",            freq: "annual" },
  { id: "regulatory_quality",   name: "Regulatory Quality",           category: "governance", source: "wgi", sourceId: "RQ.EST",                 unit: "-2.5-2.5",     description: "Ability of government to formulate policy",      freq: "annual" },
  { id: "voice_accountability", name: "Voice & Accountability",       category: "governance", source: "wgi", sourceId: "VA.EST",                 unit: "-2.5-2.5",     description: "Citizen participation in selecting govt",        freq: "annual" },
  { id: "control_corruption",   name: "Control of Corruption",       category: "governance", source: "wgi", sourceId: "CC.EST",                 unit: "-2.5-2.5",     description: "WGI control of corruption estimate",              freq: "annual" },
  { id: "open_budget",          name: "Open Budget Index",            category: "governance", source: "ibp",        sourceId: "OBI",                   unit: "0-100",        description: "Transparency of the national budget",            freq: "biennial" },

  // Technology & Innovation
  { id: "ai_readiness",         name: "AI Readiness Index",           category: "technology", source: "oxford",     sourceId: "AIRI",                  unit: "0-100",        description: "Oxford Insights govt AI readiness",              freq: "annual" },
  { id: "network_readiness",    name: "Network Readiness Index",      category: "technology", source: "turtle",     sourceId: "NRI",                   unit: "0-100",        description: "Portulans Institute technology readiness",        freq: "annual" },
  { id: "cyber_security",       name: "Secure Internet servers",      category: "technology", source: "world_bank", sourceId: "IT.NET.SECR.P6",        unit: "per 1M",       description: "Secure Internet servers per 1 million people",   freq: "annual" },
  { id: "startup_ecosystem",    name: "Startup Ecosystem Ranking",    category: "technology", source: "startupblink", sourceId: "RANK",                unit: "rank",         description: "StartupBlink global ecosystem rank",             freq: "annual" },
  { id: "internet_penetration", name: "Internet users (% of pop)",    category: "technology", source: "world_bank", sourceId: "IT.NET.USER.ZS",        unit: "%",            description: "Share of population using the internet",         freq: "annual" },
  { id: "broadband_speed",      name: "Broadband speed (median)",     category: "technology", source: "ookla",      sourceId: "MEDIAN_MBPS",           unit: "Mbps",         description: "Median download speed (Ookla)",                  freq: "annual" },
  { id: "rd_expenditure",       name: "R&D expenditure (% GDP)",      category: "technology", source: "world_bank", sourceId: "GB.XPD.RSDV.GD.ZS",     unit: "%",            description: "Research & development spending as % of GDP",    freq: "annual" },
  { id: "patent_applications",  name: "Patent applications (residents)", category: "technology", source: "world_bank", sourceId: "IP.PAT.RESD",         unit: "count",        description: "Patent applications filed by residents at national patent office", freq: "annual" },
  { id: "mobile_subs",          name: "Mobile cellular subscriptions", category: "technology", source: "world_bank", sourceId: "IT.CEL.SETS.P2",       unit: "per 100",      description: "Mobile cellular subscriptions per 100 people",    freq: "annual" },
  { id: "high_tech_exports",    name: "High-tech exports (% mfg)",    category: "technology", source: "world_bank", sourceId: "TX.VAL.TECH.MF.ZS",     unit: "%",            description: "High-tech products as % of manufactured exports", freq: "annual" },
  { id: "fixed_broadband",      name: "Fixed broadband subscriptions (per 100)", category: "technology", source: "world_bank", sourceId: "IT.NET.BBND.P2", unit: "per 100",      description: "Fixed broadband subscriptions per 100 people",    freq: "annual" },
  { id: "trademark_applications", name: "Trademark applications (residents)", category: "technology", source: "world_bank", sourceId: "IP.TMK.RESD",    unit: "count",        description: "Trademark applications filed by residents",       freq: "annual" },
  { id: "scientific_articles",  name: "Scientific & technical journal articles", category: "technology", source: "world_bank", sourceId: "IP.JRN.ARTC.SC", unit: "count",        description: "Number of published scientific articles",         freq: "annual" },
  { id: "researchers_in_rd",    name: "Researchers in R&D (per million)", category: "technology", source: "world_bank", sourceId: "SP.POP.SCIE.RD.P6", unit: "per million",  description: "Number of researchers in R&D per million people",  freq: "annual" },
  { id: "patent_app_nonres",    name: "Patent applications (non-residents)", category: "technology", source: "world_bank", sourceId: "IP.PAT.NRES",     unit: "count",        description: "Patent applications filed by non-residents",      freq: "annual" },

  // Education
  { id: "education_idx",        name: "Education Index",              category: "education",  source: "undp",       sourceId: "EDUCATION_IDX",         unit: "0-1",          description: "Mean years of schooling + expected years",        freq: "annual" },
  { id: "literacy_rate",        name: "Adult literacy rate",          category: "education",  source: "world_bank", sourceId: "SE.ADT.LITR.ZS",        unit: "%",            description: "% of adults (15+) who can read & write",         freq: "annual" },
  { id: "school_enrollment",    name: "School enrollment, secondary", category: "education",  source: "world_bank", sourceId: "SE.SEC.ENRR",           unit: "%",            description: "Gross secondary school enrollment ratio",        freq: "annual" },
  { id: "pisa_score",           name: "PISA score (avg)",             category: "education",  source: "oecd",       sourceId: "PISA",                  unit: "score",        description: "OECD PISA math/reading/science average",         freq: "triennial" },
  { id: "qs_rank",              name: "QS University Rank (avg top 5)", category: "education", source: "qs",         sourceId: "AVG_TOP5",              unit: "rank",         description: "Average rank of top-5 national universities",   freq: "annual" },
  { id: "student_teacher",      name: "Student-teacher ratio (primary)", category: "education", source: "world_bank", sourceId: "SE.PRM.ENRL.TC.ZS",  unit: "ratio",        description: "Pupils per teacher in primary school",           freq: "annual" },
  { id: "govt_education_spend", name: "Govt expenditure on education (% GDP)", category: "education", source: "world_bank", sourceId: "SE.XPD.TOTL.GD.ZS", unit: "%",            description: "Public education spending as share of GDP",       freq: "annual" },
  { id: "primary_completion",   name: "Primary completion rate",      category: "education",  source: "world_bank", sourceId: "SE.PRM.CMPT.ZS",        unit: "%",            description: "Share of children completing primary school",     freq: "annual" },

  // Healthcare
  { id: "healthcare_idx",       name: "Healthcare Index",             category: "healthcare", source: "numbeo",     sourceId: "HCI",                   unit: "0-100",        description: "Numbeo quality of healthcare system",            freq: "biennial" },
  { id: "uhc_idx",              name: "UHC Service Coverage Index",   category: "healthcare", source: "who",        sourceId: "UHC",                   unit: "0-100",        description: "WHO essential health services coverage",         freq: "annual" },
  { id: "haq_idx",              name: "Healthcare Access & Quality",  category: "healthcare", source: "ihme",       sourceId: "HAQ",                   unit: "0-100",        description: "IHME mortality amenable to healthcare",          freq: "annual" },
  { id: "life_expectancy",      name: "Life expectancy at birth",     category: "healthcare", source: "world_bank", sourceId: "SP.DYN.LE00.IN",        unit: "years",        description: "Years a newborn would live with current rates",  freq: "annual" },
  { id: "infant_mortality",     name: "Infant mortality rate",        category: "healthcare", source: "world_bank", sourceId: "SH.DYN.MORT",           unit: "per 1000",     description: "Deaths under age 1 per 1000 live births",        freq: "annual" },
  { id: "maternal_mortality",   name: "Maternal mortality ratio",     category: "healthcare", source: "world_bank", sourceId: "SH.STA.MMRT",           unit: "per 100k",     description: "Deaths per 100k live births",                    freq: "annual" },
  { id: "physicians_per_1k",    name: "Physicians per 1,000 people",  category: "healthcare", source: "world_bank", sourceId: "SH.MED.PHYS.ZS",        unit: "per 1000",     description: "Doctors per 1000 population",                    freq: "annual" },
  { id: "hospital_beds_per_1k", name: "Hospital beds per 1,000",      category: "healthcare", source: "world_bank", sourceId: "SH.MED.BEDS.ZS",        unit: "per 1000",     description: "Hospital beds per 1000 population",              freq: "annual" },
  { id: "vaccination_dpt",      name: "DPT vaccination coverage",     category: "healthcare", source: "world_bank", sourceId: "SH.IMM.IDPT",           unit: "%",            description: "% of 1-year-olds with DTP3 vaccine",             freq: "annual" },
  { id: "undernourishment",     name: "Prevalence of undernourishment", category: "healthcare", source: "world_bank", sourceId: "SN.ITK.DEFC.ZS",     unit: "%",            description: "Share of population with insufficient caloric intake", freq: "annual" },
  { id: "suicide_mortality",    name: "Suicide mortality rate (per 100k)", category: "healthcare", source: "world_bank", sourceId: "SH.STA.SUIC.P5",  unit: "per 100k",     description: "Annual suicide deaths per 100,000 people",        freq: "annual" },
  { id: "births_attended",      name: "Births attended by skilled health staff", category: "healthcare", source: "world_bank", sourceId: "SH.STA.BRTC.ZS", unit: "%",            description: "Share of births attended by skilled health personnel", freq: "annual" },
  { id: "improved_sanitation",  name: "People using safely managed sanitation", category: "healthcare", source: "world_bank", sourceId: "SH.STA.SMSS.ZS", unit: "%",            description: "Share of population using improved sanitation facilities", freq: "annual" },
  { id: "improved_water",       name: "People using safely managed drinking water", category: "healthcare", source: "world_bank", sourceId: "SH.H2O.SMDW.ZS", unit: "%",            description: "Share of population using improved drinking water sources", freq: "annual" },

  // Environment
  { id: "epi",                  name: "Environmental Performance Index", category: "environment", source: "yale",    sourceId: "EPI",                   unit: "0-100",        description: "Yale environmental health + ecosystem vitality", freq: "biennial" },
  { id: "ccpi",                 name: "Climate Change Performance Index", category: "environment", source: "germanwatch", sourceId: "CCPI",             unit: "0-100",        description: "Germanwatch climate protection ranking",         freq: "annual" },
  { id: "air_quality",          name: "Air quality (PM2.5 avg)",      category: "environment", source: "iqair",     sourceId: "PM25",                  unit: "ug/m3",        description: "Average PM2.5 concentration",                    freq: "annual" },
  { id: "co2_per_capita",       name: "CO2 emissions per capita",     category: "environment", source: "owid", sourceId: "co2_per_capita",           unit: "tonnes",       description: "CO2 emissions per person (OWID)",                freq: "annual" },
  { id: "renewable_share",      name: "Renewable energy share",       category: "environment", source: "world_bank", sourceId: "EG.FEC.RNEW.ZS",        unit: "%",            description: "Renewables as % of total energy use",            freq: "annual" },
  { id: "forest_cover",         name: "Forest area (% of land)",      category: "environment", source: "world_bank", sourceId: "AG.LND.FRST.ZS",        unit: "%",            description: "Share of land covered by forest",                freq: "annual" },
  { id: "water_stress",         name: "Water stress (freshwater withdrawal)", category: "environment", source: "world_bank", sourceId: "ER.H2O.FWST.ZS", unit: "%",            description: "Freshwater withdrawal as % of renewable resources", freq: "annual" },
  { id: "electricity_access",   name: "Access to electricity",        category: "environment", source: "world_bank", sourceId: "EG.ELC.ACCS.ZS",       unit: "%",            description: "Share of population with access to electricity",  freq: "annual" },
  { id: "energy_use_per_capita", name: "Energy use per capita",       category: "environment", source: "world_bank", sourceId: "EG.USE.PCAP.KG.OE",    unit: "kg oil eq",    description: "Primary energy use per person in kg of oil equivalent", freq: "annual" },
  { id: "renewable_electricity", name: "Renewable electricity output", category: "environment", source: "world_bank", sourceId: "EG.ELC.RNEW.ZS",      unit: "%",            description: "Electricity generated from renewable sources",    freq: "annual" },
  { id: "fossil_fuel_energy",   name: "Fossil fuel energy consumption", category: "environment", source: "world_bank", sourceId: "EG.USE.COMM.FO.ZS",  unit: "%",            description: "Fossil fuel share of total energy consumption",   freq: "annual" },
  { id: "co2_emissions_total",  name: "CO2 emissions (total)",        category: "environment", source: "world_bank", sourceId: "EN.ATM.CO2E.KT",        unit: "kt",           description: "Total CO2 emissions in kilotons",                freq: "annual" },
  { id: "sdg_score",            name: "SDG Score (overall)",          category: "environment", source: "sdg",        sourceId: "SDG_SCORE",             unit: "0-100",        description: "SDG transformation score",                       freq: "annual" },

  // Safety
  { id: "global_peace",         name: "Global Peace Index",           category: "safety",     source: "iep",        sourceId: "GPI",                   unit: "1-5",          description: "IEP peacefulness score (lower=more peaceful)",   freq: "annual" },
  { id: "crime_idx",            name: "Crime Index",                  category: "safety",     source: "numbeo",     sourceId: "CRIME",                 unit: "0-100",        description: "Numbeo perceived crime level",                   freq: "biennial" },
  { id: "safety_idx",           name: "Safety Index",                 category: "safety",     source: "numbeo",     sourceId: "SAFETY",                unit: "0-100",        description: "Numbeo perceived safety level",                  freq: "biennial" },
  { id: "terrorism_idx",        name: "Terrorism Index",              category: "safety",     source: "gtd",        sourceId: "GTI",                   unit: "0-10",         description: "Global Terrorism Index impact score",            freq: "annual" },
  { id: "road_safety",          name: "Road traffic deaths (per 100k)", category: "safety",   source: "who",        sourceId: "RTD",                   unit: "per 100k",     description: "Estimated road traffic mortality",               freq: "annual" },
  { id: "disaster_risk",        name: "Disaster Risk Index",          category: "safety",     source: "inform",     sourceId: "INFORM",                unit: "0-10",         description: "INFORM disaster risk score",                     freq: "annual" },
  { id: "intentional_homicides", name: "Intentional homicides (per 100k)", category: "safety", source: "world_bank", sourceId: "VC.IHR.PSRC.P5",     unit: "per 100k",     description: "Intentional homicide rate per 100,000 people",    freq: "annual" },
  { id: "military_expenditure", name: "Military expenditure (% of GDP)", category: "safety",   source: "world_bank", sourceId: "MS.MIL.XPND.GD.ZS",  unit: "%",            description: "Military spending as share of GDP",              freq: "annual" },

  // Equality
  { id: "gender_gap",           name: "Global Gender Gap Index",      category: "equality",   source: "wef",        sourceId: "GGGI",                  unit: "0-1",          description: "Economic, education, health, political parity",  freq: "annual" },
  { id: "gender_inequality",    name: "Gender Inequality Index",      category: "equality",   source: "undp",       sourceId: "GII",                   unit: "0-1",          description: "UNDP reproductive health + empowerment",         freq: "annual" },
  { id: "gini",                 name: "Gini coefficient",             category: "equality",   source: "world_bank", sourceId: "SI.POV.GINI",           unit: "0-100",        description: "Income inequality (0=perfect equality)",         freq: "annual" },
  { id: "female_lfp",           name: "Female labour force participation", category: "equality", source: "world_bank", sourceId: "SL.TLF.CACT.FE.ZS", unit: "%",            description: "% of women aged 15+ in the labour force",        freq: "annual" },
  { id: "poverty_215",          name: "Poverty headcount at $2.15/day", category: "equality",  source: "world_bank", sourceId: "SI.POV.DDAY",          unit: "%",            description: "Share of population living below $2.15/day",     freq: "annual" },
  { id: "vulnerable_employment", name: "Vulnerable employment",       category: "equality",    source: "world_bank", sourceId: "SL.EMP.VULN.ZS",        unit: "%",            description: "Own-account and contributing family workers as share of total employment", freq: "annual" },

  // Digital Government
  { id: "egov_idx",             name: "E-Government Development Index", category: "digital_gov", source: "un",       sourceId: "EGDI",                  unit: "0-1",          description: "UN online services + telecom + human capital",   freq: "biennial" },
  { id: "eparticipation",       name: "E-Participation Index",        category: "digital_gov", source: "un",         sourceId: "EPI",                   unit: "0-1",          description: "UN citizen engagement in e-gov services",        freq: "biennial" },
  { id: "govtech_maturity",     name: "GovTech Maturity Index",       category: "digital_gov", source: "wgi", sourceId: "GTMI",                  unit: "0-1",          description: "WB govtech support + adoption score",            freq: "annual" },
  { id: "open_data",            name: "Open Data Inventory",          category: "digital_gov", source: "od",         sourceId: "ODIN",                  unit: "0-100",        description: "Open Data Watch inventory score",                freq: "annual" },
  { id: "digital_competitiveness", name: "Digital Competitiveness Ranking", category: "digital_gov", source: "imd",   sourceId: "DCR",                   unit: "rank",         description: "IMD digital business + knowledge + tech readiness", freq: "annual" },
];

export function getAvailableIndicators(): Indicator[] {
  return INDICATORS
    .filter((i) => isSourceReady(i.source))
    .map((i) => ({
      ...i,
      updateFreq: i.freq ?? null,
    }));
}

const READY_SOURCES = new Set(["world_bank", "undp", "who", "owid", "wgi", "ti", "un"]);

function isSourceReady(source: string): boolean {
  return READY_SOURCES.has(source);
}
