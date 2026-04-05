import crypto from 'node:crypto';

function clientIp(req) {
  const raw =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0]
      : '') ||
    req.socket?.remoteAddress ||
    '';
  return raw.trim();
}

export function ipHashForWorkers(req) {
  const salt = process.env.WORKER_RATE_SALT || 'ethicalalt-worker-v1';
  return crypto.createHash('sha256').update(`${salt}:${clientIp(req)}`).digest('hex').slice(0, 32);
}

const regCounts = new Map();

function utcDayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Max worker self-registrations per IP per UTC day. */
export function assertWorkerRegisterAllowed(req, res, next) {
  const ip = ipHashForWorkers(req);
  const day = utcDayKey();
  const key = `${ip}:${day}`;
  const n = regCounts.get(key) || 0;
  if (n >= 2) {
    return res.status(429).json({ error: 'rate_limited', message: 'Maximum worker registrations per day from this network.' });
  }
  req._workerRegKey = key;
  next();
}

export function consumeWorkerRegisterSlot(key) {
  if (!key) return;
  regCounts.set(key, (regCounts.get(key) || 0) + 1);
}

const messageCounts = new Map();

/** Max direct messages per sender session per worker per rolling 24h. */
export function assertWorkerMessageAllowed(req, res, next) {
  const workerId = parseInt(req.params.id, 10);
  const body = req.body || {};
  const sess = String(body.sender_session || '').trim();
  if (!Number.isInteger(workerId) || workerId < 1) {
    return res.status(400).json({ error: 'invalid_worker' });
  }
  if (!sess || sess.length < 8) {
    return res.status(400).json({ error: 'sender_session_required' });
  }

  const key = `${sess.slice(0, 128)}:${workerId}`;
  const now = Date.now();
  let b = messageCounts.get(key);
  if (!b || now > b.resetAt) {
    b = { n: 0, resetAt: now + 86400_000 };
    messageCounts.set(key, b);
  }
  if (b.n >= 5) {
    return res.status(429).json({ error: 'rate_limited', message: 'Maximum messages per day to this worker from this session.' });
  }
  req._workerMsgBucket = b;
  next();
}

export function consumeWorkerMessageSlot(bucket) {
  if (bucket) bucket.n += 1;
}
