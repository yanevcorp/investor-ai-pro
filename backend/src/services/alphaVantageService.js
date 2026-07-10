const axios = require('axios');
const cache = require('./cache');

const BASE_URL = 'https://www.alphavantage.co/query';
// In-process cache only — the real protection against the 25-req/day
// limit is that stockController persists this response on the Stock
// document in Mongo and only calls here once per symbol, ever (unless
// explicitly refreshed).
const OVERVIEW_TTL_MS = 24 * 60 * 60 * 1000;

async function getOverview(symbol) {
  const cacheKey = `alphavantage:overview:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(BASE_URL, {
    params: { function: 'OVERVIEW', symbol, apikey: process.env.ALPHA_VANTAGE_API_KEY },
    timeout: 8000,
  });

  // Alpha Vantage returns 200 with a Note/Information field instead of
  // an HTTP error when the key is invalid or the daily quota is hit.
  if (!data || !data.Symbol || data.Note || data.Information) {
    throw new Error(
      `No Alpha Vantage overview data for ${symbol}: ${data?.Note || data?.Information || 'empty response'}`
    );
  }

  cache.set(cacheKey, data, OVERVIEW_TTL_MS);
  return data;
}

async function getEtfProfile(symbol) {
  const cacheKey = `alphavantage:etfprofile:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(BASE_URL, {
    params: { function: 'ETF_PROFILE', symbol, apikey: process.env.ALPHA_VANTAGE_API_KEY },
    timeout: 8000,
  });

  if (!data || (!data.net_assets && !Array.isArray(data.holdings))) {
    throw new Error(`No Alpha Vantage ETF profile for ${symbol}: ${data?.Note || data?.Information || 'empty response'}`);
  }

  cache.set(cacheKey, data, OVERVIEW_TTL_MS);
  return data;
}

async function getDailyHistory(symbol) {
  const cacheKey = `alphavantage:daily:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(BASE_URL, {
    params: { function: 'TIME_SERIES_DAILY', symbol, outputsize: 'compact', apikey: process.env.ALPHA_VANTAGE_API_KEY },
    timeout: 8000,
  });

  const series = data?.['Time Series (Daily)'];
  if (!series || typeof series !== 'object') {
    throw new Error(`No Alpha Vantage daily history for ${symbol}: ${data?.Note || data?.Information || 'empty response'}`);
  }

  // Oldest first, matching how a price chart reads left-to-right.
  const history = Object.entries(series)
    .map(([date, values]) => ({ date, close: Number(values['4. close']) }))
    .filter((point) => Number.isFinite(point.close))
    .sort((a, b) => a.date.localeCompare(b.date));

  cache.set(cacheKey, history, OVERVIEW_TTL_MS);
  return history;
}

module.exports = { getOverview, getEtfProfile, getDailyHistory };
