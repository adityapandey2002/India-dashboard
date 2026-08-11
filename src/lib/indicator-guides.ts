/**
 * Plain-language guides for indicators: what it is (simple words),
 * how it is calculated, and where to learn more.
 * Indicators without a curated guide fall back to a template built from the
 * DB description + category.
 */

export type IndicatorGuide = {
  /** One or two sentences a non-expert can understand. */
  simpleWords: string;
  /** How the number is actually produced. */
  calculation: string;
  /** External links to learn more. */
  learnMore: { label: string; url: string }[];
};

const SOURCE_HOMES: Record<string, { label: string; url: string }> = {
  world_bank: { label: "World Bank Open Data", url: "https://data.worldbank.org" },
  undp: { label: "UNDP Human Development Reports", url: "https://hdr.undp.org" },
  who: { label: "WHO Data", url: "https://www.who.int/data" },
  owid: { label: "Our World in Data", url: "https://ourworldindata.org" },
  wgi: { label: "Worldwide Governance Indicators", url: "https://www.worldbank.org/en/publication/worldwide-governance-indicators" },
  ti: { label: "Transparency International", url: "https://www.transparency.org/en/cpi" },
  un: { label: "UN E-Government Survey", url: "https://publicadministration.un.org/egovkb" },
  unhcr: { label: "UNHCR Refugee Data", url: "https://www.unhcr.org/refugee-statistics" },
  numbeo: { label: "Numbeo", url: "https://www.numbeo.com" },
  heritage: { label: "Heritage Foundation", url: "https://www.heritage.org/index/" },
  vdem: { label: "V-Dem Institute", url: "https://v-dem.net" },
  sspi: { label: "Social Progress Imperative", url: "https://www.socialprogress.org" },
  yale: { label: "Yale EPI", url: "https://epi.yale.edu" },
  iep: { label: "Institute for Economics & Peace", url: "https://www.visionofhumanity.org" },
  inform: { label: "INFORM Risk", url: "https://drmkc.jrc.ec.europa.eu/inform-index" },
  sdg: { label: "SDSN Sustainable Development Report", url: "https://www.sdgindex.org" },
  oxford: { label: "Oxford Insights AI Readiness", url: "https://oxfordinsights.com/ai-readiness/ai-readiness-index/" },
  turtle: { label: "Portulans Institute NRI", url: "https://networkreadinessindex.org" },
  doing_business: { label: "World Bank Doing Business Archive", url: "https://archive.doingbusiness.org" },
  wjp: { label: "World Justice Project", url: "https://worldjusticeproject.org" },
  rsf: { label: "Reporters Without Borders", url: "https://rsf.org/en/ranking" },
  ihme: { label: "IHME", url: "https://www.healthdata.org" },
  wef: { label: "World Economic Forum", url: "https://www.weforum.org" },
  oecd: { label: "OECD PISA", url: "https://www.oecd.org/pisa/" },
  gtd: { label: "Global Terrorism Index", url: "https://www.visionofhumanity.org/global-terrorism-index/" },
  ibp: { label: "International Budget Partnership", url: "https://internationalbudget.org/open-budget-survey/" },
};

const CATEGORY_PLAIN: Record<string, string> = {
  economy: "the size and health of the economy",
  society: "how people live and how well society is doing",
  governance: "how the government works and how it is perceived",
  technology: "technology adoption, innovation and connectivity",
  education: "how educated the population is and how schools perform",
  healthcare: "how healthy people are and how well the health system works",
  environment: "the state of the environment and sustainability",
  safety: "how safe people feel and how secure the country is",
  equality: "how fairly income, opportunity and rights are shared",
  digital_gov: "how digital the government's services are",
};

export const GUIDES: Record<string, IndicatorGuide> = {
  gdp_current_usd: {
    simpleWords: "GDP is the total value of everything a country produces in one year — all goods and services. It is the most common measure of the size of an economy.",
    calculation: "Sum of private consumption + government spending + investment + net exports (exports minus imports) for the year, in current US dollars using market exchange rates.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/NY.GDP.MKTP.CD" },
      { label: "Our World in Data: Economic Growth", url: "https://ourworldindata.org/economic-growth" },
    ],
  },
  gdp_ppp_usd: {
    simpleWords: "GDP adjusted for purchasing power parity (PPP) — it compares economies by how much goods and services money actually buys in each country, not just by exchange rates.",
    calculation: "Same total output as GDP, but converted using PPP exchange rates (what a fixed basket of goods costs locally) instead of market exchange rates. Better for comparing living standards.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/NY.GDP.MKTP.PP.CD" },
      { label: "Our World in Data: GDP per capita PPP", url: "https://ourworldindata.org/grapher/gdp-per-capita-worldbank" },
    ],
  },
  gdp_per_capita: {
    simpleWords: "The average economic output per person — GDP divided by population. A rough measure of average income and living standards.",
    calculation: "Total GDP (current US$) ÷ total population of that year.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/NY.GDP.PCAP.CD" },
      { label: "Our World in Data: GDP per capita", url: "https://ourworldindata.org/grapher/gdp-per-capita-worldbank" },
    ],
  },
  gdp_growth_pct: {
    simpleWords: "How much the economy grew (or shrank) compared to the year before, in percent. Positive = economy expanding.",
    calculation: "Percentage change in real (inflation-adjusted) GDP from one year to the next: (GDP_now − GDP_prev) ÷ GDP_prev × 100.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG" },
      { label: "Our World in Data: GDP growth", url: "https://ourworldindata.org/grapher/gdp-growth-rates" },
    ],
  },
  inflation_pct: {
    simpleWords: "How fast prices of everyday goods are rising. 6% means things that cost ₹100 last year cost about ₹106 now.",
    calculation: "Yearly change in the Consumer Price Index (CPI) — a weighted basket of typical household purchases measured against a base year.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG" },
      { label: "RBI Monetary Policy Reports", url: "https://www.rbi.org.in/scripts/PublicationsView.aspx?id=22032" },
    ],
  },
  unemployment_pct: {
    simpleWords: "The share of people who are looking for work but cannot find it. Lower is generally better.",
    calculation: "Unemployed people (actively seeking work, without a job) ÷ total labour force × 100. The labour force is everyone aged 15+ who works or wants to work.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS" },
      { label: "Our World in Data: Unemployment", url: "https://ourworldindata.org/grapher/unemployment-rate" },
    ],
  },
  hdi: {
    simpleWords: "The Human Development Index scores countries 0–1 on how good life is, combining health, education and income. India's score has risen steadily from ~0.43 (1990) to ~0.64+ today.",
    calculation: "Geometric mean of three sub-indices: life expectancy at birth; education (expected + mean years of schooling); and GNI per capita (log-transformed, PPP). Each sub-index is normalized 0–1 between fixed minima and maxima.",
    learnMore: [
      { label: "UNDP HDR: Human Development Index", url: "https://hdr.undp.org/data-center/human-development-index" },
      { label: "UNDP HDI technical notes", url: "https://hdr.undp.org/sites/default/files/hdr2021-22pdf_0.pdf" },
    ],
  },
  life_expectancy: {
    simpleWords: "How many years a baby born today can expect to live, if current death rates stay the same. India's has more than doubled since independence.",
    calculation: "A period life table built from current age-specific death rates — it simulates a newborn through every age using today's mortality, so it is a snapshot, not a forecast.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/SP.DYN.LE00.IN" },
      { label: "Our World in Data: Life Expectancy", url: "https://ourworldindata.org/life-expectancy" },
    ],
  },
  internet_penetration: {
    simpleWords: "The percentage of people who use the internet. India went from a tiny share in 2000 to over half the population today, thanks to cheap phones and Jio's free-data launch.",
    calculation: "Number of internet users (any device, any location, any frequency) ÷ total population × 100, from ITU and national telecom surveys.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/IT.NET.USER.ZS" },
      { label: "TRAI telecom reports (India)", url: "https://www.trai.gov.in/release-publication/reports" },
    ],
  },
  co2_per_capita: {
    simpleWords: "Average carbon dioxide emissions per person per year from burning fossil fuels. India's is low globally (~2 tonnes) but rising.",
    calculation: "Total annual CO₂ emissions (fossil fuels, cement, flaring — Global Carbon Budget) ÷ population. Territorial basis: counts emissions produced inside India, not from goods imported.",
    learnMore: [
      { label: "Our World in Data: CO2 emissions", url: "https://ourworldindata.org/co2-emissions" },
      { label: "Global Carbon Budget", url: "https://globalcarbonbudget.org/" },
    ],
  },
  maternal_mortality: {
    simpleWords: "How many women die from pregnancy or childbirth per 100,000 live births. India has cut this dramatically, but it is still far above rich countries.",
    calculation: "Modelled estimate combining civil registration, surveys and census data — deaths during pregnancy, childbirth or within 42 days after, per 100,000 live births.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/SH.STA.MMRT" },
      { label: "WHO Maternal Mortality", url: "https://www.who.int/news-room/fact-sheets/detail/maternal-mortality" },
    ],
  },
  gini: {
    simpleWords: "Measures income inequality from 0 (everyone has the same income) to 100 (one person has everything). India's ~0.33–0.35 means moderate inequality.",
    calculation: "Computed from household income/consumption surveys using the Lorenz curve — twice the area between the line of perfect equality and the actual income distribution curve.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/SI.POV.GINI" },
      { label: "Our World in Data: Income Inequality", url: "https://ourworldindata.org/income-inequality" },
    ],
  },
  corruption_idx: {
    simpleWords: "Transparency International's Corruption Perceptions Index scores how corrupt a country's public sector is seen to be, 0 (highly corrupt) to 100 (very clean). India scores around 39–40.",
    calculation: "Aggregation of 13 expert assessments and business surveys of perceived public-sector corruption, rescaled 0–100 with a statistical model to be comparable across years.",
    learnMore: [
      { label: "Transparency International CPI", url: "https://www.transparency.org/en/cpi" },
      { label: "CPI methodology", url: "https://www.transparency.org/en/cpi/2023" },
    ],
  },
  democracy_idx: {
    simpleWords: "How democratic a country's elections and governance are, from V-Dem's Electoral Democracy Index (0–10 or 0–1). It measures free and fair elections, civil liberties and the rule of law.",
    calculation: "Weighted average of five sub-indices: elected officials, universal suffrage, free and fair elections, freedom of association and expression, and alternative sources of information.",
    learnMore: [
      { label: "V-Dem datasets and codebook", url: "https://v-dem.net/data/the-v-dem-dataset/" },
      { label: "V-Dem democracy report", url: "https://v-dem.net/documents/" },
    ],
  },
  education_idx: {
    simpleWords: "UNDP's Education Index (0–1) measures how much schooling the population gets. India's has climbed steadily with rising enrollment.",
    calculation: "Mean of two normalized parts: mean years of schooling (adults 25+) and expected years of schooling (children), each rescaled to 0–1 with fixed bounds.",
    learnMore: [
      { label: "UNDP HDR education page", url: "https://hdr.undp.org/data-center/education" },
      { label: "UNDP technical notes", url: "https://hdr.undp.org/sites/default/files/hdr2021-22pdf_0.pdf" },
    ],
  },
  gni_per_capita: {
    simpleWords: "Average income per person (Gross National Income in PPP dollars) — GNI includes income Indians earn abroad, unlike GDP. Used in the HDI.",
    calculation: "Total income earned by residents (domestic + net foreign income) in PPP-adjusted dollars ÷ population. Log-transformed for the HDI to reduce impact of very high incomes.",
    learnMore: [
      { label: "UNDP HDR: GNI per capita", url: "https://hdr.undp.org/data-center/specific-country-data" },
      { label: "World Bank PPP explanation", url: "https://www.worldbank.org/en/programs/icp" },
    ],
  },
  fdi_inflow_usd: {
    simpleWords: "Foreign companies' direct investment into India — building factories, buying stakes. A sign of global confidence in the economy.",
    calculation: "Net inflow of foreign direct investment (equity + reinvested earnings + intra-company loans, minus repatriations) in current US dollars.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/BX.KLT.DINV.CD.WD" },
      { label: "DPIIT FDI statistics (India)", url: "https://dpiit.gov.in/publications/fdi-statistics" },
    ],
  },
  egov_idx: {
    simpleWords: "UN's E-Government Development Index (0–1) ranks how digital government services are. India has jumped dramatically since 2014 on Aadhaar, UPI and portal services.",
    calculation: "Weighted average of three components: Online Services Index (national portal assessment), Telecommunication Infrastructure Index (internet/mobile/broadband penetration), and Human Capital Index (literacy, enrollment).",
    learnMore: [
      { label: "UN E-Government Survey", url: "https://publicadministration.un.org/egovkb/en-us/Reports/UN-E-Government-Survey-2022" },
      { label: "UN EGDI methodology", url: "https://publicadministration.un.org/egovkb/en-us/About/Methodology" },
    ],
  },
  air_quality: {
    simpleWords: "Average fine-particle air pollution (PM2.5) in micrograms per cubic metre. India's cities are among the most polluted in the world; WHO recommends under 5 µg/m³.",
    calculation: "Population-weighted annual mean concentration of PM2.5 (particles under 2.5 micrometres) from satellite, ground monitoring and atmospheric models.",
    learnMore: [
      { label: "Our World in Data: Air pollution", url: "https://ourworldindata.org/air-pollution" },
      { label: "WHO air quality guidelines", url: "https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health" },
    ],
  },
  innovation_idx: {
    simpleWords: "WIPO's Global Innovation Index (0–100) measures how innovative an economy is — institutions, research, infrastructure, market and business sophistication, and creative output. India has steadily climbed the ranks.",
    calculation: "Weighted average of ~80 indicators split into inputs (institutions, human capital, infrastructure, market/business sophistication) and outputs (knowledge & technology, creative outputs), normalized and averaged.",
    learnMore: [
      { label: "WIPO Global Innovation Index", url: "https://www.wipo.int/global_innovation_index/en/" },
      { label: "GII report 2024", url: "https://www.wipo.int/edocs/pubdocs/en/wipo-pub-2000-2024-en-main-report-global-innovation-index-2024-17th-edition.pdf" },
    ],
  },
  poverty_215: {
    simpleWords: "The share of people living on less than $2.15 a day (international poverty line). India has lifted hundreds of millions out of extreme poverty in the last two decades.",
    calculation: "From household consumption surveys, the share of population below the $2.15/day line (2017 PPP), adjusted for how much that buys in India.",
    learnMore: [
      { label: "World Bank Poverty & Inequality", url: "https://www.worldbank.org/en/topic/poverty" },
      { label: "World Bank Poverty and Inequality Platform", url: "https://pip.worldbank.org/home" },
    ],
  },
  uhc_idx: {
    simpleWords: "WHO's Universal Health Coverage index (0–100) measures whether people can get essential health services. India's coverage has improved with Ayushman Bharat.",
    calculation: "Geometric mean of coverage indicators across four areas: reproductive/maternal/child health, infectious diseases, non-communicable diseases, and service capacity/access.",
    learnMore: [
      { label: "WHO UHC service coverage", url: "https://www.who.int/data/gho/data/themes/topics/service-coverage" },
      { label: "World Bank UHC tracker", url: "https://datatopics.worldbank.org/universal-health-coverage/" },
    ],
  },
  sdg_score: {
    simpleWords: "The Sustainable Development Report's score (0–100) of how close a country is to achieving the UN's 17 Sustainable Development Goals. Higher = closer.",
    calculation: "Averaged index of indicators tracking all 17 SDGs, each scaled 0–100 between the worst and best performers, weighted per goal with fixed country-level benchmarks.",
    learnMore: [
      { label: "Sustainable Development Report", url: "https://www.sdgindex.org" },
      { label: "SDR methodology", url: "https://www.sdgindex.org/methodological-notes/" },
    ],
  },
  ai_readiness: {
    simpleWords: "Oxford Insights' AI Readiness Index (0–100) scores how prepared a government is to adopt AI — data, skills, governance and infrastructure. India is a regional leader.",
    calculation: "Weighted average of 39 indicators across 3 pillars: government (strategy, ethics, digital capacity), technology sector (innovation, human capital), and data & infrastructure.",
    learnMore: [
      { label: "Oxford Insights AI Readiness Index", url: "https://oxfordinsights.com/ai-readiness/ai-readiness-index/" },
      { label: "Government AI Readiness Index 2023", url: "https://oxfordinsights.com/wp-content/uploads/2023/12/2023-Government-AI-Readiness-Index-1.pdf" },
    ],
  },
  patent_applications: {
    simpleWords: "How many patent applications residents file each year — a strong signal of domestic innovation. Indian residents file ~25–30k patents a year, still far behind China's millions.",
    calculation: "Count of patent applications filed by residents at the national patent office (IP India), per calendar year, as reported via WIPO statistics.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/IP.PAT.RESD" },
      { label: "WIPO IP Statistics", url: "https://www.wipo.int/ipstats/en/" },
    ],
  },
  renewable_share: {
    simpleWords: "The share of all energy a country uses that comes from renewable sources. India's ~40%+ share (mostly traditional biomass + modern renewables) is high globally, though per-capita energy use is low.",
    calculation: "Renewable energy consumption (hydro, solar, wind, biomass, geothermal) ÷ total final energy consumption × 100.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/EG.FEC.RNEW.ZS" },
      { label: "Our World in Data: Renewable energy", url: "https://ourworldindata.org/renewable-energy" },
    ],
  },
  military_expenditure: {
    simpleWords: "How much a country spends on its military as a share of its economy. India spends ~2% of GDP — among the top spenders in absolute terms.",
    calculation: "All current and capital military spending (SIPRI definition: armed forces, defence ministries, paramilitary, military space) ÷ GDP × 100.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/MS.MIL.XPND.GD.ZS" },
      { label: "SIPRI Military Expenditure Database", url: "https://www.sipri.org/databases/milex" },
    ],
  },
  happiness_score: {
    simpleWords: "The World Happiness Report score (0–10) from people rating their own lives. India's ranking is low (~126th), reflecting life satisfaction more than income.",
    calculation: "Average of survey respondents' self-reported life evaluations (0–10 Cantril ladder), explained and adjusted with six factors: GDP per capita, social support, healthy life expectancy, freedom, generosity, and absence of corruption.",
    learnMore: [
      { label: "World Happiness Report", url: "https://worldhappiness.report" },
      { label: "WHR methodology", url: "https://worldhappiness.report/faq/" },
    ],
  },
  global_peace: {
    simpleWords: "The Global Peace Index (1–5, lower = more peaceful) measures violence and conflict risk. India sits mid-table; lower scores mean fewer homicides, conflicts and militarization.",
    calculation: "Weighted score of 23 indicators across three domains: ongoing conflict (deaths, intensity), societal safety & security (homicides, violent crime, political terror), and militarization (spending, weapons, personnel).",
    learnMore: [
      { label: "Vision of Humanity: GPI", url: "https://www.visionofhumanity.org/global-peace-index/" },
      { label: "GPI report", url: "https://www.visionofhumanity.org/wp-content/uploads/2024/06/GPI-2024-web.pdf" },
    ],
  },
  literacy_rate: {
    simpleWords: "The percentage of adults (15+) who can read and write a short simple statement about their daily life. India crossed 75% recently, up from ~12% at independence.",
    calculation: "Self-reported or tested literacy from censuses and national surveys (e.g. India's National Sample Survey), as share of population aged 15+.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/SE.ADT.LITR.ZS" },
      { label: "Our World in Data: Literacy", url: "https://ourworldindata.org/literacy" },
    ],
  },
  vaccination_dpt: {
    simpleWords: "Share of 1-year-olds who got the full three-dose DPT vaccine (diphtheria, whooping cough, tetanus). India is now above 90% thanks to Mission Indradhanush.",
    calculation: "Percentage of children aged 12–23 months who received all three doses of DPT vaccine, from national immunization programs and WHO/UNICEF estimates.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/SH.IMM.IDPT" },
      { label: "WHO immunization data", url: "https://www.who.int/teams/immunization-vaccines-and-biologicals/immunization-analysis-and-insights" },
    ],
  },
  terrorism_idx: {
    simpleWords: "The Global Terrorism Index (0–10) measures deaths, injuries and damage from terrorism. India's score has fallen as attacks declined since 2015.",
    calculation: "Weighted 5-year average of terrorist incidents: deaths (highest weight), injuries, property damage, and hostage situations, normalized to a 0–10 scale.",
    learnMore: [
      { label: "Global Terrorism Index", url: "https://www.visionofhumanity.org/global-terrorism-index/" },
      { label: "GTI methodology", url: "https://www.visionofhumanity.org/wp-content/uploads/2024/02/GTI-2024-web-1.pdf" },
    ],
  },
  ease_of_doing_business: {
    simpleWords: "The World Bank's Ease of Doing Business score (0–100) measured how easy it was to start and run a business. India jumped from ~130th to ~63rd between 2014 and 2019. (Discontinued in 2021.)",
    calculation: "Average of standardized scores across 10 topics: starting a business, permits, electricity, property registration, credit, minority protection, taxes, trade, contracts, insolvency. Data ends in 2020.",
    learnMore: [
      { label: "World Bank Doing Business archive", url: "https://archive.doingbusiness.org" },
      { label: "Business Reforms in India (DPIIT)", url: "https://dpiit.gov.in/whats-new/state-reform-action-plan" },
    ],
  },
  trade_pct_gdp: {
    simpleWords: "Total exports plus imports as a share of GDP — how open and connected an economy is to world trade. India's ~45–50% reflects growing global integration.",
    calculation: "(Exports + imports of goods and services) ÷ GDP × 100.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/TG.VAL.TOTL.GD.ZS" },
      { label: "Our World in Data: Trade", url: "https://ourworldindata.org/trade-and-globalization" },
    ],
  },
  student_teacher: {
    simpleWords: "How many pupils there are per primary-school teacher. Fewer teachers per student usually means more attention per child; India's ratio has been falling.",
    calculation: "Number of pupils enrolled in primary school ÷ number of primary teachers (full-time equivalents), reported by national education ministries to UNESCO.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/SE.PRM.ENRL.TC.ZS" },
      { label: "UNESCO UIS statistics", url: "https://uis.unesco.org/" },
    ],
  },
  urbanization_pct: {
    simpleWords: "Share of people living in urban areas. India is still only ~35% urban — much lower than China (~60%) — but its cities are growing fast.",
    calculation: "Urban population (national definitions of cities/towns) ÷ total population × 100, from national censuses compiled by the UN.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS" },
      { label: "Our World in Data: Urbanization", url: "https://ourworldindata.org/urbanization" },
    ],
  },
  forest_cover: {
    simpleWords: "Percentage of a country's land covered by forest. India's forest cover has stabilized around 21–25% after heavy deforestation earlier, helped by plantation drives.",
    calculation: "Forest area (land >0.5 ha with trees >5m covering >10% of it) ÷ total land area × 100, from FAO Forest Resources Assessment.",
    learnMore: [
      { label: "World Bank indicator page", url: "https://data.worldbank.org/indicator/AG.LND.FRST.ZS" },
      { label: "FAO Forest Resources Assessment", url: "https://www.fao.org/forest-resources-assessment/en/" },
    ],
  },
  gender_gap: {
    simpleWords: "The World Economic Forum's Global Gender Gap Index (0–1) measures equality between men and women in economy, education, health and politics. India ranks low mostly on economic participation.",
    calculation: "Weighted average of four sub-indices: economic participation & opportunity, educational attainment, health & survival, political empowerment — each a female/male ratio normalized 0–1.",
    learnMore: [
      { label: "WEF Global Gender Gap Report", url: "https://www.weforum.org/publications/global-gender-gap-report-2024/" },
      { label: "Our World in Data: Gender Gap", url: "https://ourworldindata.org/gender-gap" },
    ],
  },
  press_freedom: {
    simpleWords: "Reporters Without Borders' Press Freedom ranking — lower rank numbers mean freer press. India's rank has slipped into the 160s in recent years.",
    calculation: "Composite score of journalists' and media professionals' survey answers plus expert assessments on pluralism, media independence, environment, self-censorship, legal framework and transparency. Countries are ranked; lower = freer.",
    learnMore: [
      { label: "RSF World Press Freedom Index", url: "https://rsf.org/en/ranking" },
      { label: "RSF methodology", url: "https://rsf.org/en/methodology-0" },
    ],
  },
  safety_idx: {
    simpleWords: "Numbeo's Safety Index (0–100) shows how safe people feel walking alone day and night. Higher = safer. India scores ~55–60, in the middle of the world.",
    calculation: "Inverted and scaled from survey responses asking about crime concern and safety walking alone (day/night) in each city, aggregated to country level.",
    learnMore: [
      { label: "Numbeo Safety Index", url: "https://www.numbeo.com/crime/rankings_by_country.jsp" },
      { label: "Numbeo methodology", url: "https://www.numbeo.com/common/motivation.jsp" },
    ],
  },
  cost_of_living: {
    simpleWords: "Numbeo's Cost of Living Index compares prices relative to New York City = 100. India at ~25–30 means everyday things cost roughly a quarter of what they do in NYC.",
    calculation: "Weighted average of prices for groceries, restaurants, transport, utilities and rent (city-level user-contributed data), with New York City fixed at 100.",
    learnMore: [
      { label: "Numbeo Cost of Living", url: "https://www.numbeo.com/cost-of-living/rankings_by_country.jsp" },
      { label: "Numbeo methodology", url: "https://www.numbeo.com/common/motivation.jsp" },
    ],
  },
};

/** Fallback guide built from the DB row so every indicator page has content. */
export function fallbackGuide(description: string | null, category: string, unit: string | null, sourceName: string): IndicatorGuide {
  const catText = CATEGORY_PLAIN[category] ?? "this aspect of development";
  const unitText = unit && unit !== "index" && unit !== "0-100" && unit !== "0-1" && unit !== "0-10" ? ` It is measured in ${unit}.` : "";
  const desc = description?.replace(/\.$/, "") ?? `How ${catText} is measured`;
  const sourceHome = SOURCE_HOMES[sourceName];
  return {
    simpleWords: `${desc}. This indicator tells us ${catText}.${unitText}`,
    calculation: `This indicator is published by its source organization (${sourceName}) based on national statistics, surveys or administrative records, compiled and harmonized for cross-country comparison. The exact method depends on the source's methodology — see the "learn more" links.`,
    learnMore: [
      sourceHome ?? { label: "Source organization", url: "https://data.worldbank.org" },
    ],
  };
}

export function getGuide(indicator: { id: string; description: string | null; category: string; unit: string | null; source: string }): IndicatorGuide {
  return GUIDES[indicator.id] ?? fallbackGuide(indicator.description, indicator.category, indicator.unit, indicator.source);
}
