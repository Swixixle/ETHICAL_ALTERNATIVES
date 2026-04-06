const USAGE = 'ea_consent_usage';
const OUTCOME = 'ea_consent_outcome';
const CIVIC = 'ea_consent_civic';

function readFlag(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function getImpactConsentUsage() {
  return readFlag(USAGE);
}

export function getImpactConsentOutcome() {
  return readFlag(OUTCOME);
}

export function getImpactConsentCivic() {
  return readFlag(CIVIC);
}

export function setImpactConsentUsage(on) {
  try {
    if (on) localStorage.setItem(USAGE, '1');
    else localStorage.removeItem(USAGE);
  } catch {
    /* ignore */
  }
}

export function setImpactConsentOutcome(on) {
  try {
    if (on) localStorage.setItem(OUTCOME, '1');
    else localStorage.removeItem(OUTCOME);
  } catch {
    /* ignore */
  }
}

export function setImpactConsentCivic(on) {
  try {
    if (on) localStorage.setItem(CIVIC, '1');
    else localStorage.removeItem(CIVIC);
  } catch {
    /* ignore */
  }
}

/** Clears all three consent flags (off by default after reset). */
export function clearAllImpactConsents() {
  try {
    localStorage.removeItem(USAGE);
    localStorage.removeItem(OUTCOME);
    localStorage.removeItem(CIVIC);
  } catch {
    /* ignore */
  }
}

/** Headers appended to API calls when user has opted in. */
export function getImpactFetchHeaders() {
  /** @type {Record<string, string>} */
  const h = {};
  if (getImpactConsentUsage()) h['X-EA-Consent-Usage'] = '1';
  if (getImpactConsentOutcome()) h['X-EA-Consent-Outcome'] = '1';
  if (getImpactConsentCivic()) h['X-EA-Consent-Civic'] = '1';
  return h;
}
