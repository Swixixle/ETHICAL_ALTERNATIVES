import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

const CACHE_TTL_MS = 10 * 60 * 1000;
/** @type {Map<string, { at: number; payload: object }>} */
const cache = new Map();

function buildGoogleNewsRssUrl(city, state) {
  const q = [city, state, 'local'].filter(Boolean).join(' ').trim();
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
}

/**
 * @param {string} xml
 * @param {number} limit
 * @returns {{ title: string; url: string }[]}
 */
function parseRssItems(xml, limit = 12) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    if (items.length >= limit) break;
    const titleMatch = block.match(/<title(?:[^>]*?)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/title>/i);
    const rawTitle = (titleMatch?.[1] ?? titleMatch?.[2] ?? '').trim();
    const title = rawTitle.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const linkMatch = block.match(/<link(?:[^>]*?)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/link>/i);
    let url = (linkMatch?.[1] ?? linkMatch?.[2] ?? '').trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (title) items.push({ title, url: url || '#' });
  }
  return items;
}

async function fetchNewsApiHeadlines(city, state) {
  const key = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY;
  if (!key) return null;

  const q = [city, state].filter(Boolean).join(' ');
  if (!q.trim()) return null;

  const url = new URL('https://newsapi.org/v2/everything');
  url.searchParams.set('q', q);
  url.searchParams.set('language', 'en');
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('pageSize', '12');

  const res = await fetch(url.toString(), {
    headers: { 'X-Api-Key': key },
  });

  if (!res.ok) {
    console.error('NewsAPI status', res.status);
    return null;
  }

  const data = await res.json();
  const articles = Array.isArray(data?.articles) ? data.articles : [];
  const items = [];
  for (const a of articles) {
    if (items.length >= 12) break;
    const title = typeof a?.title === 'string' ? a.title.trim() : '';
    if (!title || /removed|not available|^$/i.test(title)) continue;
    const link = typeof a?.url === 'string' ? a.url.trim() : '';
    if (link) items.push({ title, url: link });
  }
  return items.length ? items : null;
}

async function fetchRssHeadlines(city, state) {
  const rssUrl = buildGoogleNewsRssUrl(city, state);
  const res = await fetch(rssUrl, {
    headers: { 'User-Agent': 'EthicalAltLocalNews/1.0 (+https://ethicalalt-client.onrender.com)' },
  });
  if (!res.ok) return null;
  const xml = await res.text();
  const items = parseRssItems(xml, 12);
  return items.length >= 3 ? items : null;
}

async function buildFallbackTickerItems() {
  const sharesHint = process.env.STATS_REGULATOR_SHARES_SENT || '0';

  if (pool) {
    try {
      const [todayR, sellersR, totalR] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS c FROM incumbent_profiles WHERE (updated_at AT TIME ZONE 'utc')::date = (now() AT TIME ZONE 'utc')::date`
        ),
        pool.query(`SELECT COUNT(*)::int AS c FROM seller_registry WHERE active IS NOT FALSE`),
        pool.query(`SELECT COUNT(*)::int AS c FROM incumbent_profiles`),
      ]);
      const x = todayR.rows[0]?.c ?? 0;
      const y = sellersR.rows[0]?.c ?? 0;
      const total = totalR.rows[0]?.c ?? 0;
      const xLabel =
        x > 0
          ? `${x} INVESTIGATIONS RUN TODAY`
          : `${total} PUBLIC-RECORD INVESTIGATIONS LIVE`;
      const z = String(sharesHint).trim() || '0';
      return [
        { title: xLabel, url: null },
        { title: `${y} INDEPENDENT SELLERS REGISTERED`, url: null },
        { title: `${z} SHARES SENT TO REGULATORS`, url: null },
      ];
    } catch (e) {
      console.error('local-news fallback DB:', e?.message || e);
    }
  }

  return [
    { title: 'PUBLIC-RECORD INVESTIGATIONS POWER ETHICALALT', url: null },
    { title: 'LIST YOUR INDEPENDENT SHOP IN THE REGISTRY', url: null },
    {
      title: `${String(sharesHint).trim() || '0'} SHARES SENT TO REGULATORS`,
      url: null,
    },
  ];
}

/** GET /api/local-news?city=&state= */
router.get('/', async (req, res) => {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';
  const cacheKey = `${city.toLowerCase()}-${state.toLowerCase()}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return res.json(hit.payload);
  }

  try {
    let items = await fetchNewsApiHeadlines(city, state);
    let source = 'newsapi';

    if (!items?.length) {
      try {
        items = await fetchRssHeadlines(city, state);
        source = 'rss';
      } catch (e) {
        console.error('RSS local news:', e?.message || e);
        items = null;
      }
    }

    if (!items?.length) {
      const fallback = await buildFallbackTickerItems();
      const payload = {
        items: fallback,
        source: 'ethicalalt_stats',
      };
      cache.set(cacheKey, { at: now, payload });
      return res.json(payload);
    }

    const payload = { items: items.slice(0, 12), source };
    cache.set(cacheKey, { at: now, payload });
    res.json(payload);
  } catch (e) {
    console.error('local-news:', e?.message || e);
    const fallback = await buildFallbackTickerItems();
    res.json({ items: fallback, source: 'ethicalalt_stats' });
  }
});

export default router;
