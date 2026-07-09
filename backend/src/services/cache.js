// Tiny in-memory TTL cache shared by the market-data services. Only
// survives within a single warm process/container — on Vercel that's
// fine for short-lived quote/news caching, and the truly rate-limited
// data (Alpha Vantage) is persisted in Mongo instead, not here.

const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  if (entry) store.delete(key);
  return null;
}

function set(key, data, ttlMs) {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

module.exports = { get, set };
