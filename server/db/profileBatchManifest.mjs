/**
 * Single source of truth for hand-authored profile folders under server/db/.
 * Each folder is imported with the full relational upsert (verdict_tags,
 * primary_sources, investigation_summary, etc.) — same rules as
 * import_profiles_from_dir.mjs.
 *
 * Human-readable progress: docs/MASTER_COMPANY_TRACKING.md
 */
export const HAND_AUTHORED_PROFILE_BATCH_DIRS = [
  'profiles_batch02',
  'profiles_batch03',
  'profiles_batch04',
  'profiles_batch05',
  'profiles_batch06',
  'profiles_batch07',
  'profiles_batch08',
];
