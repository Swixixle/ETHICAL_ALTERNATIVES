-- Walmart incumbent row (relational). Run after schema.sql.
--   psql "$DATABASE_URL" -f server/db/schema.sql
--   psql "$DATABASE_URL" -f server/db/seed_walmart.sql

INSERT INTO incumbent_profiles (
  brand_name,
  brand_slug,
  parent_company,
  ultimate_parent,
  known_subsidiaries,
  effective_tax_rate,
  statutory_rate,
  offshore_entities,
  government_subsidies_usd,
  criminal_cases,
  civil_settlements,
  regulatory_actions,
  lobbying_annual_usd,
  lobbying_year,
  pac_donations_usd,
  pac_year,
  osha_violations_5yr,
  wage_theft_settlements_usd,
  living_wage_certified,
  union_suppression_documented,
  epa_enforcement_actions_5yr,
  investigation_summary,
  verdict_tags,
  overall_concern_level,
  last_researched,
  research_confidence,
  primary_sources
)
VALUES (
  'Walmart',
  'walmart',
  'Walmart Inc.',
  'Walmart Inc.',
  ARRAY['Sam''s Club', 'Asda', 'Flipkart', 'Jet.com'],
  24.4,
  21.0,
  ARRAY['Netherlands entities', 'Luxembourg holding structures'],
  1200000000,
  $crim$
  [
    {
      "case": "FCPA bribery violations - Mexico, Brazil, India, China",
      "year": 2019,
      "outcome": "Settled $282M",
      "source_url": "https://www.justice.gov/opa/pr/walmart-inc-and-brazil-based-subsidiary-agree-pay-137-million-resolve-foreign-corrupt"
    }
  ]
  $crim$::jsonb,
  $civil$
  [
    {
      "case": "Opioid dispensing practices",
      "year": 2022,
      "amount": 3100000000,
      "source_url": "https://www.justice.gov/opa/pr/walmart-agrees-pay-31-billion-settle-opioid-crisis-allegations-against-company"
    }
  ]
  $civil$::jsonb,
  $reg$
  [
    {
      "agency": "NLRB",
      "description": "Multiple retaliation cases re: union organizing 2023-2025",
      "source_url": "https://www.nlrb.gov"
    }
  ]
  $reg$::jsonb,
  4100000,
  2023,
  2800000,
  2022,
  89,
  180000000,
  false,
  true,
  7,
  'Walmart Inc. is the world''s largest retailer, controlled by the Walton family (~45% ownership). In 2019, Walmart paid $282M to settle the largest-ever Foreign Corrupt Practices Act case, admitting to bribery of government officials across four countries to obtain permits and approvals. In 2022, Walmart agreed to a $3.1B settlement over its role in the opioid crisis. The company has an active NLRB case history related to union organizing responses. Effective tax rate of 24.4% vs 21% statutory; has received over $1.2B in state and local subsidies since 2000 (Good Jobs First). EPA enforcement actions include a $11.7M hazardous waste settlement (2023). No living wage certification; documented union avoidance training program.',
  ARRAY[
    'tax_avoidance',
    'labor_violations',
    'corruption',
    'bribery',
    'wage_theft',
    'environmental_violations',
    'union_suppression',
    'political_influence'
  ],
  'significant',
  CURRENT_DATE,
  'high',
  ARRAY[
    'https://www.justice.gov/opa/pr/walmart-inc-and-brazil-based-subsidiary-agree-pay-137-million-resolve-foreign-corrupt',
    'https://www.justice.gov/opa/pr/walmart-agrees-pay-31-billion-settle-opioid-crisis-allegations-against-company',
    'https://www.goodjobsfirst.org',
    'https://echo.epa.gov'
  ]
)
ON CONFLICT (brand_slug) DO UPDATE SET
  brand_name = EXCLUDED.brand_name,
  parent_company = EXCLUDED.parent_company,
  ultimate_parent = EXCLUDED.ultimate_parent,
  known_subsidiaries = EXCLUDED.known_subsidiaries,
  effective_tax_rate = EXCLUDED.effective_tax_rate,
  statutory_rate = EXCLUDED.statutory_rate,
  offshore_entities = EXCLUDED.offshore_entities,
  government_subsidies_usd = EXCLUDED.government_subsidies_usd,
  criminal_cases = EXCLUDED.criminal_cases,
  civil_settlements = EXCLUDED.civil_settlements,
  regulatory_actions = EXCLUDED.regulatory_actions,
  lobbying_annual_usd = EXCLUDED.lobbying_annual_usd,
  lobbying_year = EXCLUDED.lobbying_year,
  pac_donations_usd = EXCLUDED.pac_donations_usd,
  pac_year = EXCLUDED.pac_year,
  osha_violations_5yr = EXCLUDED.osha_violations_5yr,
  wage_theft_settlements_usd = EXCLUDED.wage_theft_settlements_usd,
  living_wage_certified = EXCLUDED.living_wage_certified,
  union_suppression_documented = EXCLUDED.union_suppression_documented,
  epa_enforcement_actions_5yr = EXCLUDED.epa_enforcement_actions_5yr,
  investigation_summary = EXCLUDED.investigation_summary,
  verdict_tags = EXCLUDED.verdict_tags,
  overall_concern_level = EXCLUDED.overall_concern_level,
  last_researched = EXCLUDED.last_researched,
  research_confidence = EXCLUDED.research_confidence,
  primary_sources = EXCLUDED.primary_sources,
  updated_at = now();
