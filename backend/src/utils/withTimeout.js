// Bounds how long the caller waits for a promise, without cancelling the
// underlying work — used for enrichment calls whose own worst case (e.g.
// Alpha Vantage's deliberately-throttled sequential financials-history
// fetch, chained behind FMP's ratios/key-metrics/sector-PE calls) can run
// far longer than the rest of a request combined. Losing the race just
// means that section renders as unavailable for this response; the slow
// call still finishes in the background and populates the cache/DB for
// next time.
function withTimeout(promise, ms, fallback = null) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

module.exports = { withTimeout };
