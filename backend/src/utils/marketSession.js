// Finnhub's free-tier /quote endpoint returns one "current price" field
// with no separate pre-market/after-hours price or session flag — that
// distinction is a paid-plan feature. What IS reliably true for free-tier
// data is that `c` tracks the latest trade including extended-hours activity
// for actively-traded US symbols. So instead of fabricating a second price
// we don't have, this labels the existing quote by the current US market
// session, computed directly from NYSE/Nasdaq hours (no extra API call).
function getMarketSession(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const map = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });

  if (map.weekday === 'Sat' || map.weekday === 'Sun') return 'closed';

  // Intl reports midnight as hour "24" for hour12: false in some engines.
  const hour = map.hour === '24' ? 0 : Number(map.hour);
  const minutesOfDay = hour * 60 + Number(map.minute);

  const PRE_MARKET_START = 4 * 60;
  const REGULAR_START = 9 * 60 + 30;
  const REGULAR_END = 16 * 60;
  const AFTER_HOURS_END = 20 * 60;

  if (minutesOfDay >= PRE_MARKET_START && minutesOfDay < REGULAR_START) return 'pre-market';
  if (minutesOfDay >= REGULAR_START && minutesOfDay < REGULAR_END) return 'regular';
  if (minutesOfDay >= REGULAR_END && minutesOfDay < AFTER_HOURS_END) return 'after-hours';
  return 'closed';
}

module.exports = { getMarketSession };
