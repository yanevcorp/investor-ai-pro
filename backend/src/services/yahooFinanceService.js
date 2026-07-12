const axios = require('axios');
const cache = require('./cache');

// query1.finance.yahoo.com/v8/finance/chart is an undocumented, unofficial
// endpoint — not a published API, no key, no ToS-sanctioned access. It's
// used here only because it's the sole free source found that returns real
// multi-year daily history (Alpha Vantage's outputsize=full and intraday
// are premium-only on the free tier; Finnhub's /stock/candle returns 403).
// It can change or start blocking requests without notice — callers must
// treat failures as routine and fall back to whatever's already cached.
const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

// A plain axios default User-Agent (or none) gets refused by Yahoo's edge;
// a standard browser UA is required for a 200.
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

// One 20-year daily fetch per symbol covers every timeframe button the UI
// offers (1M through 20Y) — callers slice the cached array locally instead
// of making a separate request per range.
async function getDailyHistory(symbol) {
  const cacheKey = `yahoo:daily:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(`${BASE_URL}/${encodeURIComponent(symbol)}`, {
    params: { range: '20y', interval: '1d' },
    headers: HEADERS,
    timeout: 8000,
  });

  const result = data?.chart?.result?.[0];
  const timestamps = result?.timestamp;
  const closes = result?.indicators?.quote?.[0]?.close;

  if (!Array.isArray(timestamps) || !Array.isArray(closes) || timestamps.length === 0) {
    throw new Error(`No Yahoo Finance history for ${symbol}`);
  }

  const history = timestamps
    .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), close: closes[i] }))
    .filter((point) => Number.isFinite(point.close));

  cache.set(cacheKey, history, HISTORY_TTL_MS);
  return history;
}

module.exports = { getDailyHistory };
