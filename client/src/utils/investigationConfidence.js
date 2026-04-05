import { countIndexedSources } from './investigationSources.js';

/**
 * @typedef {'verified_record' | 'partial_record' | 'inferred' | 'limited_profile' | 'no_public_record'} ConfidenceBadgeKey
 */

/**
 * Five-state confidence badge (Instruction 2). Verified only for database profiles.
 * @param {Record<string, unknown> | null | undefined} investigation
 * @param {Record<string, unknown> | null | undefined} identification
 * @param {Record<string, unknown> | null | undefined} result
 * @returns {{ key: ConfidenceBadgeKey; label: string; tooltip: string }}
 */
export function getConfidenceBadgePresentation(investigation, identification, result) {
  const tooltip =
    'This rating reflects the depth of public documentation, not a moral verdict.';
  if (!investigation || typeof investigation !== 'object') {
    return { key: 'no_public_record', label: 'NO PUBLIC RECORD', tooltip };
  }
  const pt = String(investigation.profile_type || '').toLowerCase();
  if (pt === 'database') {
    return { key: 'verified_record', label: 'VERIFIED RECORD', tooltip };
  }
  const method =
    identification && typeof identification === 'object'
      ? identification.identification_method
      : null;
  if (method === 'scene_inference') {
    return { key: 'inferred', label: 'INFERRED', tooltip };
  }
  const n = countIndexedSources(investigation, result);
  if (n < 3) {
    return { key: 'limited_profile', label: 'LIMITED PROFILE', tooltip };
  }
  if (n <= 6) {
    return { key: 'partial_record', label: 'PARTIAL RECORD', tooltip };
  }
  return { key: 'partial_record', label: 'PARTIAL RECORD', tooltip };
}

/**
 * Visual / copy treatment for investigation vs identification state (designed, never blank).
 * @param {Record<string, unknown> | null | undefined} identification
 * @param {Record<string, unknown> | null | undefined} investigation
 * @param {{ researchLoading?: boolean; searchedSources?: unknown }} [opts]
 */
export function getInvestigationRecordPresentation(identification, investigation, opts = {}) {
  const { researchLoading, searchedSources } = opts;

  const srcList = Array.isArray(searchedSources) ? searchedSources.map(String) : [];

  if (researchLoading && !investigation) {
    return { variant: 'loading' };
  }

  if (!investigation) {
    return {
      variant: 'no_record',
      badge: 'NO PUBLIC RECORD FOUND',
      borderLeft: '3px solid #6a8a9a',
      badgeBg: 'rgba(106, 138, 154, 0.2)',
      badgeColor: '#a8c4d8',
      sentence: srcList.length
        ? `No matching corporate profile in our index. Searched: ${srcList.join(', ')}.`
        : 'No matching corporate profile was returned for this identification.',
    };
  }

  const pt = String(investigation.profile_type || '');
  const method =
    identification && typeof identification === 'object'
      ? identification.identification_method
      : null;

  if (pt === 'database') {
    return {
      variant: 'verified',
      badge: 'VERIFIED PROFILE',
      borderLeft: '3px solid #6aaa8a',
      badgeBg: 'rgba(106, 170, 138, 0.2)',
      badgeColor: '#6aaa8a',
      sentence: null,
    };
  }

  if (method === 'scene_inference') {
    return {
      variant: 'inferred',
      badge: 'INFERRED',
      borderLeft: '3px dashed #f0a820',
      badgeBg: 'rgba(240, 168, 32, 0.12)',
      badgeColor: '#f0a820',
      sentence:
        'Identification used scene context; verify the brand and treat findings as provisional until confirmed.',
    };
  }

  return {
    variant: 'partial',
    badge: 'LIVE RESEARCH',
    borderLeft: '3px solid #f0a820',
    badgeBg: 'rgba(240, 168, 32, 0.12)',
    badgeColor: '#f0a820',
    sentence: 'Live research from public sources — verify primary citations below.',
  };
}
