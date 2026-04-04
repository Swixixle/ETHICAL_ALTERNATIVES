/** UTC calendar date YYYY-MM-DD */
export function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * Weekday themes for city identity rotation (getUTCDay: 0 = Sunday).
 * @returns {{ rotation_date: string; rotation_theme: string; theme_prompt: string }}
 */
export function getDailyRotationMeta(now = new Date()) {
  const rotation_date = utcDateKey(now);
  const dow = now.getUTCDay();
  const rows = [
    {
      rotation_theme: 'Sunday — local icons and landmarks',
      theme_prompt:
        'Focus on famous local icons, signature buildings, beloved landmarks, and what visitors recognize first — the visual identity of the place.',
    },
    {
      rotation_theme: 'Monday — arts and culture',
      theme_prompt:
        'Focus on arts and culture: museums, galleries, live music, theater, public art, literary history, and creative scenes.',
    },
    {
      rotation_theme: 'Tuesday — food and makers',
      theme_prompt:
        'Focus on the food scene and maker tradition: iconic dishes, markets, chefs, bakeries, distilleries, craft producers, and what locals actually eat.',
    },
    {
      rotation_theme: 'Wednesday — history',
      theme_prompt:
        'Focus on local history: founding stories, industry heritage, neighborhoods that shaped the city, and how the past shows up today.',
    },
    {
      rotation_theme: 'Thursday — independent business',
      theme_prompt:
        'Focus on independent retail and services: neighborhood shop strips, legacy family businesses, and where independents cluster.',
    },
    {
      rotation_theme: 'Friday — community and activism',
      theme_prompt:
        'Focus on community organizing, civic movements, mutual aid, labor history, and grassroots change tied to this place.',
    },
    {
      rotation_theme: 'Saturday — recreation and outdoor',
      theme_prompt:
        'Focus on recreation and the outdoors: parks, trails, rivers, sports culture, racing, games, and how people play here.',
    },
  ];
  const { rotation_theme, theme_prompt } = rows[dow];
  return { rotation_date, rotation_theme, theme_prompt };
}
