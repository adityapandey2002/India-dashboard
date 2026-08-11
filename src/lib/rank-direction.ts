/**
 * Direction of each indicator: whether a HIGHER value is better.
 * Indicators where a higher value is worse (mortality, pollution, debt, etc.)
 * are ranked ascending instead of descending on the rankings page.
 */

const LOWER_IS_BETTER = new Set([
  // Economy
  "inflation_pct",
  "unemployment_pct",
  "public_debt_pct_gdp",
  "self_employed",
  "global_competitiveness", // rank: lower better
  // Society
  "multidim_poverty",
  "age_dependency",
  "refugee_population", // lower forced displacement better
  // Governance
  "press_freedom", // rank: lower better
  "corruption_idx", // higher = more corrupt
  // Education
  "student_teacher", // lower pupil:teacher ratio better
  // Healthcare
  "infant_mortality",
  "maternal_mortality",
  "suicide_mortality",
  "undernourishment",
  // Environment
  "ccpi", // rank: lower better
  "air_quality", // PM2.5
  "co2_per_capita",
  "co2_emissions_total",
  "water_stress",
  "fossil_fuel_energy",
  // Safety
  "crime_idx",
  "terrorism_idx",
  "road_safety", // deaths per 100k
  "disaster_risk",
  "intentional_homicides",
  "military_expenditure",
  // Equality
  "gini",
  "gender_inequality",
  "poverty_215",
  "vulnerable_employment",
  // Technology
  "qs_rank", // rank: lower better
  "startup_ecosystem", // rank: lower better
  // Digital gov
  "digital_competitiveness", // rank: lower better
  "open_data", // rank: lower better
]);

export function isHigherBetter(indicatorId: string): boolean {
  return !LOWER_IS_BETTER.has(indicatorId);
}
