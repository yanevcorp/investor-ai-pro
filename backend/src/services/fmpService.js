const axios = require('axios');
const cache = require('./cache');
const { withRetry } = require('../utils/withRetry');

// FMP retired their /api/v3/ endpoints on 2025-08-31 ("Legacy Endpoint" —
// confirmed live against this key) in favor of /stable/. The free tier
// caps statement/ratio history at 5 records regardless of `limit`
// requested (confirmed live: limit>5 returns a "Premium Query Parameter"
// error), so this only ever asks for 5.
const BASE_URL = 'https://financialmodelingprep.com/stable';
const STATEMENT_TTL_MS = 24 * 60 * 60 * 1000;
const CONSENSUS_TTL_MS = 24 * 60 * 60 * 1000;
const INTRADAY_TTL_MS = 60 * 1000;
const SECTOR_PE_TTL_MS = 24 * 60 * 60 * 1000;
const DAILY_OHLC_TTL_MS = 24 * 60 * 60 * 1000;
const EARNINGS_TTL_MS = 12 * 60 * 60 * 1000;
const STATEMENT_LIMIT = 5;
// Same free-tier cap as ratios/key-metrics (STATEMENT_LIMIT) — requesting
// more throws a "Premium Query Parameter" error, confirmed live.
const EARNINGS_LIMIT = 5;
// Kept well under the caller's overall budget (the whole /stocks/:symbol
// request needs to fit inside the hosting platform's function timeout) —
// FMP's free tier is otherwise prone to hanging rather than failing fast,
// which previously let one slow call stall the entire page.
const REQUEST_TIMEOUT_MS = 5000;

function apiKey() {
  return process.env.FMP_API_KEY;
}

// Today's 1-minute candles — the only free path found (on any provider
// tested) to a real intraday chart, which is what the 1D timeframe needs.
async function getIntradayChart(symbol) {
  const cacheKey = `fmp:intraday:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await withRetry(() =>
    axios.get(`${BASE_URL}/historical-chart/1min`, {
      params: { symbol, apikey: apiKey() },
      timeout: REQUEST_TIMEOUT_MS,
    })
  );

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No FMP intraday data for ${symbol}`);
  }

  // FMP returns newest-first; the chart wants oldest-first, and only
  // today's session (the endpoint can return the last couple of trading
  // days near market open/close boundaries). Full OHLCV is kept (not just
  // close) so this same fetch also serves the 1D candlestick view —
  // existing callers that only read `.close` are unaffected.
  const latestDay = data[0].date.slice(0, 10);
  const points = data
    .filter((p) => p.date.startsWith(latestDay))
    .map((p) => ({ date: p.date, open: p.open, high: p.high, low: p.low, close: p.close, volume: p.volume }))
    .reverse();

  cache.set(cacheKey, points, INTRADAY_TTL_MS);
  return points;
}

// Full daily OHLCV history for the candlestick chart's 1W/1M/3M/6M/1Y/5Y
// timeframes — a separate dataset from the Stock document's `priceHistory`
// (close-only, Yahoo/Alpha-Vantage-sourced, used for sparklines/drawdown/
// correlation) so this feature doesn't touch that schema or its existing
// consumers. Confirmed live: available on the free tier, unlike
// insider-trading below.
async function getDailyOhlc(symbol) {
  const cacheKey = `fmp:dailyohlc:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await withRetry(() =>
    axios.get(`${BASE_URL}/historical-price-eod/full`, {
      params: { symbol, apikey: apiKey() },
      timeout: REQUEST_TIMEOUT_MS,
    })
  );

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No FMP daily OHLC for ${symbol}`);
  }

  // FMP returns newest-first; the chart wants oldest-first.
  const points = data
    .map((p) => ({ date: p.date, open: p.open, high: p.high, low: p.low, close: p.close, volume: p.volume }))
    .reverse();

  cache.set(cacheKey, points, DAILY_OHLC_TTL_MS);
  return points;
}

// One call returns both already-reported quarters (real epsActual/
// revenueActual) and upcoming ones (those fields null) — enough to build
// "next earnings date" and "last 4 quarters actual vs estimate" from a
// single fetch. Confirmed live: this endpoint has no `time` (before/
// after-market) field on the current plan, so that detail is left out
// rather than guessed.
async function getEarningsCalendar(symbol) {
  const cacheKey = `fmp:earnings:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await withRetry(() =>
    axios.get(`${BASE_URL}/earnings`, {
      params: { symbol, limit: EARNINGS_LIMIT, apikey: apiKey() },
      timeout: REQUEST_TIMEOUT_MS,
    })
  );

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No FMP earnings calendar for ${symbol}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = data.find((r) => r.date >= today && typeof r.epsActual !== 'number') || null;
  const reported = data
    .filter((r) => typeof r.epsActual === 'number')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4)
    .map((r) => {
      const epsEstimated = typeof r.epsEstimated === 'number' ? r.epsEstimated : null;
      const revenueEstimated = typeof r.revenueEstimated === 'number' ? r.revenueEstimated : null;
      const revenueActual = typeof r.revenueActual === 'number' ? r.revenueActual : null;
      return {
        date: r.date,
        epsActual: r.epsActual,
        epsEstimated,
        epsSurprisePercent:
          epsEstimated !== null && epsEstimated !== 0
            ? Number((((r.epsActual - epsEstimated) / Math.abs(epsEstimated)) * 100).toFixed(1))
            : null,
        revenueActual,
        revenueEstimated,
        revenueSurprisePercent:
          revenueActual !== null && revenueEstimated !== null && revenueEstimated !== 0
            ? Number((((revenueActual - revenueEstimated) / Math.abs(revenueEstimated)) * 100).toFixed(1))
            : null,
      };
    });

  const result = {
    next: upcoming
      ? {
          date: upcoming.date,
          epsEstimated: typeof upcoming.epsEstimated === 'number' ? upcoming.epsEstimated : null,
          revenueEstimated: typeof upcoming.revenueEstimated === 'number' ? upcoming.revenueEstimated : null,
        }
      : null,
    history: reported,
  };

  cache.set(cacheKey, result, EARNINGS_TTL_MS);
  return result;
}

async function getRatiosHistory(symbol) {
  const cacheKey = `fmp:ratios:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await withRetry(() =>
    axios.get(`${BASE_URL}/ratios`, {
      params: { symbol, limit: STATEMENT_LIMIT, apikey: apiKey() },
      timeout: REQUEST_TIMEOUT_MS,
    })
  );

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No FMP ratios for ${symbol}`);
  }

  cache.set(cacheKey, data, STATEMENT_TTL_MS);
  return data;
}

async function getKeyMetricsHistory(symbol) {
  const cacheKey = `fmp:keymetrics:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await withRetry(() =>
    axios.get(`${BASE_URL}/key-metrics`, {
      params: { symbol, limit: STATEMENT_LIMIT, apikey: apiKey() },
      timeout: REQUEST_TIMEOUT_MS,
    })
  );

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No FMP key metrics for ${symbol}`);
  }

  cache.set(cacheKey, data, STATEMENT_TTL_MS);
  return data;
}

// Broad GICS-style sectors only (Technology, Healthcare, Financial
// Services, ...) — not the granular Finnhub industry names this app
// otherwise uses, so callers must map to one of these first (see
// utils/sectorMapping.js). Defaults to NASDAQ, since most symbols in this
// app's seed/provisioned set are NASDAQ-listed; this is an approximation,
// not a per-exchange-accurate figure. `date` is a required param with no
// "latest" option, and has no data for non-trading days — so this walks
// backward from the given date until it finds the most recent trading day
// that has a snapshot (handles weekends/holidays without a market calendar).
async function getSectorPE(sector, date) {
  const cacheKey = `fmp:sectorpe:${sector}:${date}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Capped at 4 attempts (not a full week) with a short per-request
  // timeout — this walks backward day-by-day, so an unbounded/8s-timeout
  // version could burn up to ~56s on a bad day, which alone was enough to
  // blow the whole /stocks/:symbol request past the hosting platform's
  // function timeout.
  let cursor = new Date(`${date}T00:00:00Z`);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const dateStr = cursor.toISOString().slice(0, 10);
    try {
      const { data } = await axios.get(`${BASE_URL}/sector-pe-snapshot`, {
        params: { date: dateStr, sector, exchange: 'NASDAQ', apikey: apiKey() },
        timeout: 4000,
      });
      if (Array.isArray(data) && data.length > 0 && typeof data[0].pe === 'number') {
        cache.set(cacheKey, data[0].pe, SECTOR_PE_TTL_MS);
        return data[0].pe;
      }
    } catch (err) {
      // try the previous day
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  throw new Error(`No FMP sector PE for ${sector} near ${date}`);
}

async function getPriceTargetConsensus(symbol) {
  const cacheKey = `fmp:pricetarget:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await withRetry(() =>
    axios.get(`${BASE_URL}/price-target-consensus`, {
      params: { symbol, apikey: apiKey() },
      timeout: REQUEST_TIMEOUT_MS,
    })
  );

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No FMP price target consensus for ${symbol}`);
  }

  const result = {
    high: data[0].targetHigh,
    low: data[0].targetLow,
    consensus: data[0].targetConsensus,
    median: data[0].targetMedian,
  };

  cache.set(cacheKey, result, CONSENSUS_TTL_MS);
  return result;
}

async function getGradesConsensus(symbol) {
  const cacheKey = `fmp:grades:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await withRetry(() =>
    axios.get(`${BASE_URL}/grades-consensus`, {
      params: { symbol, apikey: apiKey() },
      timeout: REQUEST_TIMEOUT_MS,
    })
  );

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No FMP grades consensus for ${symbol}`);
  }

  const g = data[0];
  const result = {
    strongBuy: g.strongBuy || 0,
    buy: g.buy || 0,
    hold: g.hold || 0,
    sell: g.sell || 0,
    strongSell: g.strongSell || 0,
    consensus: g.consensus || null,
  };
  result.totalAnalysts = result.strongBuy + result.buy + result.hold + result.sell + result.strongSell;

  cache.set(cacheKey, result, CONSENSUS_TTL_MS);
  return result;
}

module.exports = {
  getIntradayChart,
  getDailyOhlc,
  getEarningsCalendar,
  getRatiosHistory,
  getKeyMetricsHistory,
  getSectorPE,
  getPriceTargetConsensus,
  getGradesConsensus,
};
