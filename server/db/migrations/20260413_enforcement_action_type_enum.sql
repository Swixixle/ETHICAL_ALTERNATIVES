-- Canonical action_type values for enforcement-style incidents in profile JSON (deep_research.per_category[].incidents[]).
-- Application code resolves and validates these on read; this type documents the contract for DB tooling and future normalized tables.

DO $$
BEGIN
  CREATE TYPE enforcement_action_type AS ENUM (
    'disposition',
    'regulator_action',
    'recall',
    'civil_allegation',
    'contextual'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

COMMENT ON TYPE enforcement_action_type IS
  'Incident classification: disposition (final), regulator_action (non-final agency), recall, civil_allegation, contextual (press/background). Stored on API-shaped incidents as text matching these literals.';
