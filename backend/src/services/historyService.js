const yahooFinanceService = require('./yahooFinanceService');
const alphaVantageService = require('./alphaVantageService');
const fmpService = require('./fmpService');

const HISTORY_FRESHNESS_MS = 24 * 60 * 60 * 1000;

// Same caching shape as stockController's getFundamentals: persisted on the
// Stock document so this is fetched at most once per symbol per day,
// shared by sparklines, drawdown, correlation calc, and the price chart.
//
// Yahoo Finance's unofficial chart endpoint (see yahooFinanceService) is
// the primary source — it's the only free one found that returns real
// multi-year daily history. Since it's undocumented and can break or start
// blocking requests at any time, a failure falls back to Alpha Vantage's
// official (but ~100-day) compact history, so the app degrades to a
// shorter chart instead of losing price history entirely.
async function getOrFetchHistory(stockDoc) {
  const isFresh =
    Array.isArray(stockDoc.priceHistory) &&
    stockDoc.priceHistory.length > 0 &&
    stockDoc.priceHistoryFetchedAt &&
    Date.now() - new Date(stockDoc.priceHistoryFetchedAt).getTime() < HISTORY_FRESHNESS_MS;

  if (isFresh) return stockDoc.priceHistory;

  try {
    const history = await yahooFinanceService.getDailyHistory(stockDoc.symbol);
    stockDoc.priceHistory = history;
    stockDoc.priceHistoryFetchedAt = new Date();
    await stockDoc.save();
    return history;
  } catch (err) {
    try {
      const history = await alphaVantageService.getDailyHistory(stockDoc.symbol);
      stockDoc.priceHistory = history;
      stockDoc.priceHistoryFetchedAt = new Date();
      await stockDoc.save();
      return history;
    } catch (fallbackErr) {
      // Both sources unavailable — keep whatever's cached, even if stale.
      return Array.isArray(stockDoc.priceHistory) ? stockDoc.priceHistory : [];
    }
  }
}

const RANGE_DAYS = {
  '1M': 30,
  '6M': 182,
  '1Y': 365,
  '3Y': 365 * 3,
  '5Y': 365 * 5,
  '10Y': 365 * 10 + 3,
  '20Y': 365 * 20 + 5, // +5 comfortably covers the full cached dataset despite leap years
};

// 1D has no daily-close representation — it's handled as a special case by
// the caller (see getIntradayHistory), never through sliceRange.
async function getIntradayHistory(symbol) {
  try {
    return await fmpService.getIntradayChart(symbol);
  } catch (err) {
    return [];
  }
}

// Existing callers (RiskGrid drawdown, the Watchlist/Portfolio expanded
// chart, alert detail sparklines) expect "the available period" to mean a
// recent window, not two decades of history — so the default (no range
// requested) stays at 1Y rather than returning the full cached array.
// AnalysisPage's timeframe buttons pass an explicit range for the rest.
function sliceRange(history, range) {
  if (!Array.isArray(history) || history.length === 0) return [];

  if (range === 'YTD') {
    const year = new Date().getUTCFullYear();
    return history.filter((point) => point.date >= `${year}-01-01`);
  }

  const days = RANGE_DAYS[range] || RANGE_DAYS['1Y'];
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return history.filter((point) => point.date >= cutoffStr);
}

module.exports = { getOrFetchHistory, sliceRange, getIntradayHistory };
