const axios = require('axios');
const cache = require('./cache');

const BASE_URL = 'https://newsapi.org/v2/everything';
const NEWS_TTL_MS = 15 * 60 * 1000;

// Legal-entity suffixes rarely appear verbatim in news prose, so an exact
// phrase match against the full registered name (e.g. "Rocket Lab USA,
// Inc.") returns almost nothing. Strip them down to the brand name.
const SUFFIX_RE = /,?\s+(Inc\.?|Incorporated|Corp\.?|Corporation|Co\.?|Ltd\.?|plc|USA|Holdings)\.?$/i;

function cleanCompanyName(name) {
  let cleaned = name;
  let prev;
  do {
    prev = cleaned;
    cleaned = cleaned.replace(SUFFIX_RE, '').trim();
  } while (cleaned !== prev);
  return cleaned;
}

function buildQuery(companyName, symbol) {
  const cleaned = cleanCompanyName(companyName);

  // A single short word (e.g. "Strategy", MicroStrategy's real post-rebrand
  // name) is too generic on its own — it pulls in unrelated articles that
  // happen to contain the word, and generic finance terms like "stock" are
  // common enough that they don't actually narrow much. Requiring the
  // specific ticker to co-occur is far more precise.
  if (!cleaned.includes(' ') && cleaned.length <= 12) {
    return symbol ? `${cleaned} AND ${symbol}` : `${cleaned} AND (stock OR shares OR Nasdaq OR NYSE)`;
  }

  // Quoting forces an exact-phrase match instead of NewsAPI OR-ing each
  // word, which otherwise pulls in lots of unrelated noise.
  return `"${cleaned}"`;
}

async function getCompanyNews(companyName, symbol, pageSize = 5) {
  const q = buildQuery(companyName, symbol);
  const cacheKey = `news:${q}:${pageSize}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(BASE_URL, {
    params: {
      q,
      language: 'en',
      sortBy: 'relevancy',
      pageSize,
      apiKey: process.env.NEWS_API_KEY,
    },
    timeout: 5000,
  });

  const articles = (data.articles || []).map((a) => ({
    title: a.title,
    description: a.description,
    url: a.url,
    source: a.source?.name || '',
    publishedAt: a.publishedAt,
  }));

  cache.set(cacheKey, articles, NEWS_TTL_MS);
  return articles;
}

module.exports = { getCompanyNews };
