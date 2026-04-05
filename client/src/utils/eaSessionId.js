/** Persistent anon session for Hire Direct messaging & taps. */
export function getEaSessionId() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    let id = sessionStorage.getItem('ea_session_id');
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `ea-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem('ea_session_id', id);
    }
    return id;
  } catch {
    return null;
  }
}
