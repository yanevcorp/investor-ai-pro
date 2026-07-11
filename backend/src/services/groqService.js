const Groq = require('groq-sdk');

let client = null;
function getClient() {
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

// What the screener can actually filter on: fields stored on every Stock
// document (symbol, name, sector, verdict, aiScore, daily changePercent)
// plus, for ETFs only, an expense ratio cached from Alpha Vantage's
// ETF_PROFILE. Anything the user asks for that isn't backed by one of these
// (debt ratios, insider-buying activity, revenue growth, etc.) has no real
// data source in this app, so the model is told to list it in
// unsupportedCriteria instead of inventing a filter for it.
const SYSTEM_PROMPT = `You turn a free-text stock-screener query (Bulgarian or English) into structured filters for a small stock database.

Available fields to filter on:
- sectorKeywords: sector/industry keywords to match. The database stores sector names in ENGLISH ONLY (from Finnhub, e.g. "Technology", "Software", "Semiconductors", "Aerospace & Defense", "Consumer Electronics"). Always translate to English keywords even when the query is in Bulgarian — e.g. "tech"/"технологични" -> ["Technology", "Software"]. Never return Bulgarian or other non-English sector words here.
- nameKeywords: company name or ticker keywords, in their original form (do not translate names/tickers).
- verdicts: any of STRONG BUY, BUY, HOLD, SELL, STRONG SELL. Treat "undervalued" ("подценени") as ["STRONG BUY", "BUY"].
- minAiScore: minimum AI score (0-100), use for phrases like "highly rated" or "strong signals".
- minChangePercent / maxChangePercent: daily price change percent bounds. Use this as the best available proxy for "growth" ("ръст") phrasing, e.g. "growth over 20%" -> minChangePercent: 20. This is a DAILY change, not revenue growth.
- isEtf: true for ETF-only queries, false to exclude ETFs.
- maxExpenseRatioPercent: only meaningful for ETFs, e.g. "low expense ratio" -> a small number like 0.5.

The database has NO data for: debt ratios, insider buying/selling, analyst ratings, revenue/earnings growth, dividend history, or anything not listed above. If the query asks for one of those (or anything else not backed by the fields above), do NOT invent a filter for it — instead add a short phrase describing it (in Bulgarian) to unsupportedCriteria.

Respond with ONLY a single JSON object, no prose, no markdown code fences. It must have exactly these keys:
{
  "sectorKeywords": string[],
  "nameKeywords": string[],
  "verdicts": string[],
  "minAiScore": number | null,
  "minChangePercent": number | null,
  "maxChangePercent": number | null,
  "isEtf": boolean | null,
  "maxExpenseRatioPercent": number | null,
  "summary": string,
  "unsupportedCriteria": string[]
}

Always include every key. Use empty arrays / null where nothing applies. "summary" is one short Bulgarian sentence describing what you searched for, to show the user above the results.`;

const VALID_VERDICTS = ['STRONG BUY', 'BUY', 'HOLD', 'SELL', 'STRONG SELL'];

// Unlike Anthropic's json_schema structured outputs, Groq's json_object mode
// only guarantees syntactically valid JSON — it does not enforce a shape,
// and llama3-8b-8192 is a small/fast model that won't always follow the
// requested keys exactly. Normalize defensively instead of trusting the
// response shape.
function normalizeFilters(raw) {
  const toStringArray = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === 'string') : []);
  const toNumberOrNull = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
  const toBoolOrNull = (value) => (typeof value === 'boolean' ? value : null);

  return {
    sectorKeywords: toStringArray(raw?.sectorKeywords),
    nameKeywords: toStringArray(raw?.nameKeywords),
    verdicts: toStringArray(raw?.verdicts).filter((v) => VALID_VERDICTS.includes(v)),
    minAiScore: toNumberOrNull(raw?.minAiScore),
    minChangePercent: toNumberOrNull(raw?.minChangePercent),
    maxChangePercent: toNumberOrNull(raw?.maxChangePercent),
    isEtf: toBoolOrNull(raw?.isEtf),
    maxExpenseRatioPercent: toNumberOrNull(raw?.maxExpenseRatioPercent),
    summary: typeof raw?.summary === 'string' ? raw.summary : '',
    unsupportedCriteria: toStringArray(raw?.unsupportedCriteria),
  };
}

async function parseScreenerQuery(query) {
  const groq = getClient();

  const completion = await groq.chat.completions.create({
    // llama3-8b-8192 was decommissioned by Groq on 2025-08-30; this is
    // their recommended same-speed, same-tier replacement.
    model: 'llama-3.1-8b-instant',
    temperature: 0.2,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: query },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error('No filter output returned by Groq');

  return normalizeFilters(JSON.parse(content));
}

module.exports = { parseScreenerQuery };
