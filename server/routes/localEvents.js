import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { nameMatchesChain, normalizeChainNeedles } from '../utils/chainMatch.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UA =
  'EthicalAlt/1.0 (https://ethicalalt-client.onrender.com; local events reverse geocode)';

const chainNeedles = normalizeChainNeedles(
  JSON.parse(readFileSync(join(__dirname, '../data/chain-exclusions.json'), 'utf8'))
);

const router = Router();

/**
 * @param {string | undefined} city
 * @param {string | undefined} state
 */
function buildCuratedLinks(city, state) {
  const loc = [city, state].filter(Boolean).join(', ') || 'United States';
  const q = encodeURIComponent(loc);
  const links = [
    {
      label: 'Eventbrite — city events',
      href: `https://www.eventbrite.com/d/location/${q}/events/`,
      hint: 'Independent & venue listings near you',
    },
    {
      label: 'Songkick — local concerts',
      href: `https://www.songkick.com/metro-areas/search?query=${q}`,
      hint: 'Live music discovery',
    },
    {
      label: 'Meetup — community events',
      href: `https://www.meetup.com/find/?location=${encodeURIComponent(loc)}&source=EVENTS`,
      hint: 'Open mics, trivia, groups',
    },
    {
      label: 'TicketWeb — indie venues',
      href: `https://www.ticketweb.com/search?q=${encodeURIComponent(loc)}`,
      hint: 'Smaller rooms & local promoters',
    },
    {
      label: 'Facebook Events',
      href: `https://www.facebook.com/events/search/?q=${encodeURIComponent(`events in ${loc}`)}`,
      hint: 'Browse in browser / app',
    },
  ];

  const c = String(city || '').toLowerCase();
  const s = String(state || '').toLowerCase();
  if (s === 'tx' && /austin|^atx$/.test(c)) {
    links.splice(
      2,
      0,
      {
        label: 'Do512 — Austin listings',
        href: 'https://do512.com/',
        hint: 'Tonight & this week',
      }
    );
  }
  if (s === 'tx' && /dallas|fort\s*worth|ft\.?\s*w\.?|dfw/.test(c)) {
    links.splice(
      2,
      0,
      {
        label: 'Do214 — DFW listings',
        href: 'https://do214.com/',
        hint: 'Tonight & this week',
      }
    );
  }

  return links;
}

/** @param {string} name @param {string} [desc] */
function inferCategoryTag(name, desc) {
  const t = `${String(name || '')} ${String(desc || '')}`.toLowerCase();
  if (/\bfarmers?\s+market\b/.test(t)) return 'MARKET';
  if (/trivia|pub\s*quiz|quiz\s*night/.test(t)) return 'TRIVIA';
  if (/karaoke/.test(t)) return 'KARAOKE';
  if (/open\s*mic|open-mic|openmic/.test(t)) return 'OPEN MIC';
  if (/comedy|stand\s*-?\s*up|standup/.test(t)) return 'COMEDY';
  if (/concert|live\s+music|\bjazz\b|\bblues\b|\brock\b|\bsymphony\b|\bgig\b/.test(t)) return 'MUSIC';
  return 'COMMUNITY';
}

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ city?: string; state?: string }>}
 */
async function reversePlace(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return {};
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
        'User-Agent': UA,
      },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const a = data?.address || {};
    const city = a.city || a.town || a.village || a.hamlet || a.municipality || a.county;
    const state = a.state || a['ISO3166-2-lvl4'];
    return {
      city: typeof city === 'string' ? city : undefined,
      state: typeof state === 'string' ? state : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * @param {any} event
 * @returns {{ id: string; name: string; venue_name: string; start_iso: string; price_label: string; is_free: boolean; category_tag: string; url: string }}
 */
function mapEventbriteEvent(event) {
  const name =
    typeof event?.name?.text === 'string'
      ? event.name.text
      : typeof event?.name === 'string'
        ? event.name
        : 'Event';
  const desc =
    typeof event?.description?.text === 'string' ? event.description.text.slice(0, 400) : '';

  const venue = event?.venue;
  let venueName = 'Venue TBA';
  if (venue && typeof venue === 'object') {
    if (typeof venue.name === 'string' && venue.name.trim()) venueName = venue.name.trim();
    else if (typeof venue.address?.localized_area_display === 'string') {
      venueName = venue.address.localized_area_display;
    }
  }

  const startIso =
    typeof event?.start?.utc === 'string'
      ? event.start.utc
      : typeof event?.start?.local === 'string'
        ? event.start.local
        : new Date().toISOString();

  let isFree = Boolean(event?.is_free);
  let priceLabel = isFree ? 'FREE' : 'Paid';
  const minPrice = priceMinFromAvailability(event?.ticket_availability);
  if (!isFree && minPrice != null) {
    priceLabel = minPrice;
  }

  const url = typeof event?.url === 'string' ? event.url : '';

  return {
    id: String(event?.id ?? event?.event_id ?? `${name}-${startIso}`),
    name,
    venue_name: venueName,
    start_iso: startIso,
    price_label: priceLabel,
    is_free: isFree,
    category_tag: inferCategoryTag(name, desc),
    url: url || `https://www.eventbrite.com/e/-e-${event?.id ?? ''}`,
  };
}

/** @param {any} avail */
function priceMinFromAvailability(avail) {
  if (!avail || typeof avail !== 'object') return null;
  const d = avail.minimum_ticket_price;
  if (d && typeof d.display === 'string') return d.display;
  if (d && typeof d.value === 'number' && d.currency) {
    return `${d.currency === 'USD' ? '$' : ''}${Number(d.value).toFixed(0)}`;
  }
  return null;
}

/** GET /api/events?lat=&lng=&date=&city=&state= */
router.get('/', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  let city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  let state = typeof req.query.state === 'string' ? req.query.state.trim() : '';

  if (Number.isFinite(lat) && Number.isFinite(lng) && (!city || !state)) {
    const rev = await reversePlace(lat, lng);
    if (!city && rev.city) city = rev.city;
    if (!state && rev.state) state = rev.state;
  }

  const place = { city: city || null, state: state || null };
  const token = process.env.EVENTBRITE_API_KEY?.trim();

  if (!token) {
    return res.json({
      mode: 'links',
      curated_links: buildCuratedLinks(city || undefined, state || undefined),
      place,
    });
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({
      error: 'lat and lng required for Eventbrite search',
      mode: 'links',
      curated_links: buildCuratedLinks(city || undefined, state || undefined),
      place,
    });
  }

  const rangeStart = new Date();
  rangeStart.setUTCHours(0, 0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 8);
  rangeEnd.setUTCHours(23, 59, 59, 999);

  if (typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
    const d = new Date(`${req.query.date}T12:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      rangeStart.setTime(d.getTime());
      rangeStart.setUTCHours(0, 0, 0, 0);
      rangeEnd.setTime(d.getTime());
      rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 7);
      rangeEnd.setUTCHours(23, 59, 59, 999);
    }
  }

  try {
    const url = new URL('https://www.eventbriteapi.com/v3/events/search/');
    url.searchParams.set('location.latitude', String(lat));
    url.searchParams.set('location.longitude', String(lng));
    url.searchParams.set('location.within', '25mi');
    url.searchParams.set('expand', 'venue');
    url.searchParams.set('sort_by', 'date');
    url.searchParams.set('start_date.range_start', rangeStart.toISOString().replace(/\.\d{3}Z$/, 'Z'));
    url.searchParams.set('start_date.range_end', rangeEnd.toISOString().replace(/\.\d{3}Z$/, 'Z'));

    const ebRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!ebRes.ok) {
      const errText = await ebRes.text().catch(() => '');
      console.warn('[events] Eventbrite HTTP', ebRes.status, errText.slice(0, 200));
      return res.json({
        mode: 'links',
        curated_links: buildCuratedLinks(city || undefined, state || undefined),
        place,
        eventbrite_status: ebRes.status,
      });
    }

    const data = await ebRes.json();
    const rawEvents = Array.isArray(data?.events) ? data.events : [];
    const mapped = [];

    for (const ev of rawEvents) {
      const row = mapEventbriteEvent(ev);
      if (row.venue_name && nameMatchesChain(row.venue_name, chainNeedles)) continue;
      mapped.push(row);
    }

    mapped.sort((a, b) => String(a.start_iso).localeCompare(String(b.start_iso)));

    return res.json({
      mode: 'events',
      events: mapped,
      place,
    });
  } catch (e) {
    console.error('[events]', e?.message || e);
    return res.json({
      mode: 'links',
      curated_links: buildCuratedLinks(city || undefined, state || undefined),
      place,
      error: e instanceof Error ? e.message : 'events fetch failed',
    });
  }
});

export default router;
