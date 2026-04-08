#!/usr/bin/env node
/**
 * Back-compat entrypoint — implementation lives in server/db/corroborate_profiles.mjs.
 *
 *   node db/corroborate_profiles.mjs [flags]
 *
 * is equivalent to:
 *
 *   cd server && node db/corroborate_profiles.mjs [flags]
 */
import '../server/db/corroborate_profiles.mjs';
