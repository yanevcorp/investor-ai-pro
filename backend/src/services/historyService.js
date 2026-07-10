const alphaVantageService = require('./alphaVantageService');

const HISTORY_FRESHNESS_MS = 24 * 60 * 60 * 1000;

// Same caching shape as stockController's getFundamentals: persisted on the
// Stock document so Alpha Vantage's 25-req/day quota is spent at most once
// per symbol per day, shared by sparklines, drawdown, and correlation calc.
async function getOrFetchHistory(stockDoc) {
  const isFresh =
    Array.isArray(stockDoc.priceHistory) &&
    stockDoc.priceHistory.length > 0 &&
    stockDoc.priceHistoryFetchedAt &&
    Date.now() - new Date(stockDoc.priceHistoryFetchedAt).getTime() < HISTORY_FRESHNESS_MS;

  if (isFresh) return stockDoc.priceHistory;

  try {
    const history = await alphaVantageService.getDailyHistory(stockDoc.symbol);
    stockDoc.priceHistory = history;
    stockDoc.priceHistoryFetchedAt = new Date();
    await stockDoc.save();
    return history;
  } catch (err) {
    // Rate-limited/unavailable — fall back to whatever's cached, even if stale.
    return Array.isArray(stockDoc.priceHistory) ? stockDoc.priceHistory : [];
  }
}

module.exports = { getOrFetchHistory };
