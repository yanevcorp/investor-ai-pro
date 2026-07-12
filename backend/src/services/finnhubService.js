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

// Fallback for FMP's grades-consensus (buy/hold/sell breakdown) when FMP
// is down/rate-limited/timing out — Finnhub's free tier has this endpoint
// (unlike /stock/price-target, which is 403 on free tier, so there's no
// equivalent fallback for the price-target side).
async function getRecommendationTrends(symbol) {
  const cacheKey = `finnhub:recommendation:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(`${BASE_URL}/stock/recommendation`, {
    params: { symbol, token: process.env.FINNHUB_API_KEY },
    timeout: 5000,
  });

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No Finnhub recommendation trends for ${symbol}`);
  }

  // Most recent period is first.
  const r = data[0];
  const result = {
    strongBuy: r.strongBuy || 0,
    buy: r.buy || 0,
    hold: r.hold || 0,
    sell: r.sell || 0,
    strongSell: r.strongSell || 0,
    consensus: null,
  };
  result.totalAnalysts = result.strongBuy + result.buy + result.hold + result.sell + result.strongSell;

  cache.set(cacheKey, result, PROFILE_TTL_MS);
  return result;
}

// Insider trading, via Finnhub instead of FMP — FMP's /insider-trading
// endpoint returned 402 "Restricted Endpoint" on this app's subscription
// (confirmed live), while Finnhub's equivalent is available and SEC-Form-4
// sourced. No title/role field is present in this response (checked
// live), so that detail is left out rather than guessed.
const SEC_BUY_CODES = new Set(['P']);
const SEC_SELL_CODES = new Set(['S']);
const SEC_CODE_LABELS = {
  A: 'Награда/Grant',
  G: 'Дарение',
  M: 'Упражняване на опция',
  F: 'Данъчно удържане',
  D: 'Прехвърляне към емитента',
};

async function getInsiderTransactions(symbol) {
  const cacheKey = `finnhub:insider:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(`${BASE_URL}/stock/insider-transactions`, {
    params: { symbol, token: process.env.FINNHUB_API_KEY },
    timeout: 5000,
  });

  const rows = Array.isArray(data?.data) ? data.data : [];

  const transactions = rows
    .slice()
    .sort((a, b) => (b.transactionDate || '').localeCompare(a.transactionDate || ''))
    .slice(0, 10)
    .map((r) => {
      const shares = Math.abs(r.change || 0);
      const price = r.transactionPrice || 0;
      const isBuy = SEC_BUY_CODES.has(r.transactionCode);
      const isSell = SEC_SELL_CODES.has(r.transactionCode);
      return {
        name: r.name || '',
        transactionType: isBuy ? 'buy' : isSell ? 'sell' : 'other',
        transactionLabel: isBuy ? 'Покупка' : isSell ? 'Продажба' : SEC_CODE_LABELS[r.transactionCode] || r.transactionCode || '—',
        shares,
        price,
        totalValue: shares * price,
        date: r.transactionDate || r.filingDate || null,
      };
    });

  cache.set(cacheKey, transactions, PROFILE_TTL_MS);
  return transactions;
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

module.exports = { getQuote, getProfile, searchSymbols, getRecommendationTrends, getInsiderTransactions };
