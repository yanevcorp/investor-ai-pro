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

// getIncomeStatement/getBalanceSheet/getCashFlow/getEarnings share this
// shape: annual reports going back as far as Alpha Vantage has them
// (typically 10-20+ years for established companies), keyed off
// annualReports/annualEarnings. Same free-tier quota (25 req/day) and
// "cache forever, refetch only if explicitly asked" philosophy as
// getOverview — a full financials history for one symbol costs 4 of these
// calls, so permanent caching matters even more here.
async function getIncomeStatement(symbol) {
  const cacheKey = `alphavantage:income:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(BASE_URL, {
    params: { function: 'INCOME_STATEMENT', symbol, apikey: process.env.ALPHA_VANTAGE_API_KEY },
    timeout: 8000,
  });

  if (!data || !Array.isArray(data.annualReports)) {
    throw new Error(`No Alpha Vantage income statement for ${symbol}: ${data?.Note || data?.Information || 'empty response'}`);
  }

  cache.set(cacheKey, data, OVERVIEW_TTL_MS);
  return data;
}

async function getBalanceSheet(symbol) {
  const cacheKey = `alphavantage:balance:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(BASE_URL, {
    params: { function: 'BALANCE_SHEET', symbol, apikey: process.env.ALPHA_VANTAGE_API_KEY },
    timeout: 8000,
  });

  if (!data || !Array.isArray(data.annualReports)) {
    throw new Error(`No Alpha Vantage balance sheet for ${symbol}: ${data?.Note || data?.Information || 'empty response'}`);
  }

  cache.set(cacheKey, data, OVERVIEW_TTL_MS);
  return data;
}

async function getCashFlow(symbol) {
  const cacheKey = `alphavantage:cashflow:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(BASE_URL, {
    params: { function: 'CASH_FLOW', symbol, apikey: process.env.ALPHA_VANTAGE_API_KEY },
    timeout: 8000,
  });

  if (!data || !Array.isArray(data.annualReports)) {
    throw new Error(`No Alpha Vantage cash flow for ${symbol}: ${data?.Note || data?.Information || 'empty response'}`);
  }

  cache.set(cacheKey, data, OVERVIEW_TTL_MS);
  return data;
}

async function getEarnings(symbol) {
  const cacheKey = `alphavantage:earnings:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(BASE_URL, {
    params: { function: 'EARNINGS', symbol, apikey: process.env.ALPHA_VANTAGE_API_KEY },
    timeout: 8000,
  });

  if (!data || !Array.isArray(data.annualEarnings)) {
    throw new Error(`No Alpha Vantage earnings for ${symbol}: ${data?.Note || data?.Information || 'empty response'}`);
  }

  cache.set(cacheKey, data, OVERVIEW_TTL_MS);
  return data;
}

module.exports = {
  getOverview,
  getEtfProfile,
  getDailyHistory,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getEarnings,
};
