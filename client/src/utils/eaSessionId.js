/**
 * Persistent anonymous session for taps, history, and Hire Direct.
 * Tries sessionStorage, then localStorage, then a module in-memory id so
 * `session_id` is never null when the API persists tap_history.
 */
const KEY = 'ea_session_id';

let memoryFallback = '';

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ea-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readFrom(storage) {
  if (!storage) return null;
  try {
    const id = storage.getItem(KEY);
    return id && String(id).trim() ? String(id).trim() : null;
  } catch {
    return null;
  }
}

function writeTo(storage, id) {
  if (!storage || !id) return;
  try {
    storage.setItem(KEY, id);
  } catch {
    /* quota / private mode */
  }
}

/**
 * @returns {string} Non-empty session id in the browser; empty on SSR.
 */
export function getEaSessionId() {
  if (typeof window === 'undefined') return '';

  let id =
    readFrom(typeof sessionStorage !== 'undefined' ? sessionStorage : null) ||
    readFrom(typeof localStorage !== 'undefined' ? localStorage : null);

  if (!id) {
    id = newId();
    writeTo(typeof sessionStorage !== 'undefined' ? sessionStorage : null, id);
    writeTo(typeof localStorage !== 'undefined' ? localStorage : null, id);
  } else {
    writeTo(typeof sessionStorage !== 'undefined' ? sessionStorage : null, id);
    writeTo(typeof localStorage !== 'undefined' ? localStorage : null, id);
  }

  if (!id) {
    if (!memoryFallback) memoryFallback = newId();
    return memoryFallback;
  }

  return id;
}
