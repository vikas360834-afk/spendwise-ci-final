// Tiny in-memory per-user rate limiter (single-process; sufficient for the
// JSON-file deployment — for multi-instance use a shared store instead).
const buckets = new Map();

function rateLimit({ windowMs = 60000, max = 15 } = {}) {
  return (req, res, next) => {
    const key = (req.user && req.user.id) || req.ip;
    const now = Date.now();
    const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    if (hits.length >= max) {
      return res.status(429).json({ error: 'Too many requests — please wait a moment and retry.' });
    }
    hits.push(now);
    buckets.set(key, hits);
    next();
  };
}

module.exports = { rateLimit };
