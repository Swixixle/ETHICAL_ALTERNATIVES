const CITY_CACHE = {};

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

function utcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param {string} city
 * @param {string | null} state
 * @param {string} country
 */
export async function getCityIdentity(city, state, country) {
  const key = `${city}-${state || ''}-${utcDateKey()}`.toLowerCase();
  if (CITY_CACHE[key]) return CITY_CACHE[key];

  try {
    const res = await fetch(`${apiPrefix()}/api/city-identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, state, country }),
    });
    const data = await res.json();
    CITY_CACHE[key] = data;
    return data;
  } catch {
    const fb = {
      headline: `${city}'s independent businesses`,
      subheading: `What makes ${city} worth supporting locally`,
      scene_description: `${city} has a community of independent makers, restaurants, and shops that exist outside the chain ecosystem.`,
      known_for: [],
      neighborhood_note: null,
      independent_tradition: null,
      daily_rotation: {
        rotation_date: utcDateKey(),
        rotation_theme: 'Unable to load rotation',
      },
    };
    CITY_CACHE[key] = fb;
    return fb;
  }
}
