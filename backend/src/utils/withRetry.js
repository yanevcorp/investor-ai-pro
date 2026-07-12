// Retries a request once (by default) when the failure looks transient —
// network errors, timeouts, or 5xx — since those are the failure modes a
// short backoff can actually fix. A 4xx or a provider's own "no data for
// this symbol" error is permanent, so retrying it would just add latency
// for nothing.
function isRetryable(err) {
  const status = err.response?.status;
  if (status) return status >= 500;
  return err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || !err.response;
}

async function withRetry(fn, { retries = 1, delayMs = 300 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryable(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastErr;
}

module.exports = { withRetry };
