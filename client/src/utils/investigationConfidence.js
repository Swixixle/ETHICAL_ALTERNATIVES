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
