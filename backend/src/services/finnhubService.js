const axios = require('axios');
const cache = require('./cache');

const BASE_URL = 'https://finnhub.io/api/v1';
const QUOTE_TTL_MS = 30 * 1000;
const PROFILE_TTL_MS = 24 * 60 * 60 * 1000;
const SEARCH_TTL_MS = 5 * 60 * 1000;

async function getQuote(symbol) {
  const cacheKey = `finnhub:quote:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(`${BASE_URL}/quote`, {
    params: { symbol, token: process.env.FINNHUB_API_KEY },
    timeout: 5000,
  });

  if (!data || typeof data.c !== 'number' || data.c === 0) {
    throw new Error(`No Finnhub quote data for ${symbol}`);
  }

  const quote = {
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    // Unix seconds of the last trade Finnhub has seen for this symbol —
    // during pre-market/after-hours this is the extended-hours print time,
    // used to show "as of HH:MM" next to the extended-hours price.
    timestamp: data.t ? new Date(data.t * 1000).toISOString() : null,
  };

  cache.set(cacheKey, quote, QUOTE_TTL_MS);
  return quote;
}

async function getProfile(symbol) {
  const cacheKey = `finnhub:profile:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(`${BASE_URL}/stock/profile2`, {
    params: { symbol, token: process.env.FINNHUB_API_KEY },
    timeout: 5000,
  });

  if (!data || !data.name) {
    throw new Error(`No Finnhub profile data for ${symbol}`);
  }

  const profile = {
    name: data.name,
    sector: data.finnhubIndustry || '',
    logo: data.logo || '',
    website: data.weburl || '',
    marketCap: data.marketCapitalization || null,
    currency: data.currency || 'USD',
  };

  cache.set(cacheKey, profile, PROFILE_TTL_MS);
  return profile;
}

async function searchSymbols(query) {
  const cacheKey = `finnhub:search:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(`${BASE_URL}/search`, {
    params: { q: query, token: process.env.FINNHUB_API_KEY },
    timeout: 5000,
  });

  const results = Array.isArray(data?.result) ? data.result : [];
  cache.set(cacheKey, results, SEARCH_TTL_MS);
  return results;
}

module.exports = { getQuote, getProfile, searchSymbols };
