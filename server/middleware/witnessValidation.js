import crypto from 'node:crypto';
import { WITNESS_LEGAL_NOTICE } from '../constants/witnessLegal.js';

const buckets = new Map();

function getBucket(ipHash) {
  const now = Date.now();
  let b = buckets.get(ipHash);
  if (!b || now > b.resetAt) {
    b = { n: 0, resetAt: now + 3600_000 };
    buckets.set(ipHash, b);
  }
  return b;
}

export function ipHashForWitness(req) {
  const raw =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0]
      : '') ||
    req.socket?.remoteAddress ||
    '';
  const salt = process.env.WITNESS_RATE_SALT || 'ethicalalt-witness-v1';
  return crypto.createHash('sha256').update(`${salt}:${raw.trim()}`).digest('hex').slice(0, 32);
}

function isBlockedDisplayName(name) {
  const lower = name.toLowerCase().trim();
  if (lower.length < 2) return true;
  return (
    /^(test|asdf|asdfgh|qwerty|foo|bar|xxx|abc|nobody|none|n\/a|123|1234|aaa|bbb|ccc)/i.test(
      lower
    ) || lower === 'hi'
  );
}

/**
 * POST /api/witness — rate limit, abuse filters, attach ip hash for logging.
 * Expects express.json() already applied.
 */
export function validateWitnessPost(req, res, next) {
  res.setHeader('X-EthicalAlt-Registry', 'civic-witness-v1');

  const ipHash = ipHashForWitness(req);
  req.witness_ip_hash = ipHash;

  const b = getBucket(ipHash);
  if (b.n >= 3) {
    return res.status(429).json({
      error: 'rate_limited',
      message: 'Maximum witness registrations per hour reached from this network.',
      legal_notice: WITNESS_LEGAL_NOTICE,
    });
  }

  const body = req.body || {};
  const name = String(body.display_name || '').replace(/<[^>]*>/g, '').trim();
  if (name.length < 2) {
    return res.status(400).json({ error: 'invalid_name', legal_notice: WITNESS_LEGAL_NOTICE });
  }
  if (isBlockedDisplayName(name)) {
    return res.status(400).json({ error: 'invalid_name', legal_notice: WITNESS_LEGAL_NOTICE });
  }

  req.witness_validated_name = name;
  next();
}

/** Call after successful INSERT to count toward hourly limit. */
export function consumeWitnessRateSlot(ipHash) {
  const b = getBucket(ipHash);
  b.n += 1;
}
