import crypto from 'node:crypto';

const buckets = new Map();
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_TAPS = 5;

function getIpHash(req) {
  const raw =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0]
      : '') ||
    req.socket?.remoteAddress ||
    '';
  const salt = process.env.TAP_RATE_SALT || 'ethicalalt-tap-v1';
  return crypto.createHash('sha256').update(`${salt}:${raw.trim()}`).digest('hex').slice(0, 32);
}

function getBucket(ipHash) {
  const now = Date.now();
  let b = buckets.get(ipHash);
  if (!b || now > b.resetAt) {
    b = { n: 0, resetAt: now + WINDOW_MS };
    buckets.set(ipHash, b);
  }
  return b;
}

export function tapRateLimit(req, res, next) {
  if (req.body?.preview_only === true) return next();
  const ipHash = getIpHash(req);
  const b = getBucket(ipHash);
  if (b.n >= MAX_TAPS) {
    const resetInMs = b.resetAt - Date.now();
    const resetInHours = Math.ceil(resetInMs / 3600_000);
    return res.status(429).json({
      error: 'rate_limited',
      message: `You've used your 5 free investigations for today. Come back in ${resetInHours} hour${resetInHours === 1 ? '' : 's'} — or search the Black Book for documented profiles.`,
      resets_in_ms: resetInMs,
      limit: MAX_TAPS,
    });
  }
  b.n++;
  res.setHeader('X-EthicalAlt-Taps-Remaining', MAX_TAPS - b.n);
  next();
}
