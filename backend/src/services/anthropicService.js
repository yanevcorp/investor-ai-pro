const Anthropic = require('@anthropic-ai/sdk');

let client = null;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// What the screener can actually filter on: fields stored on every Stock
// document (symbol, name, sector, verdict, aiScore, daily changePercent)
// plus, for ETFs only, an expense ratio cached from Alpha Vantage's
// ETF_PROFILE. Anything the user asks for that isn't backed by one of these
// (debt ratios, insider-buying activity, revenue growth, etc.) has no real
// data source in this app, so Claude is told to list it in
// unsupportedCriteria instead of inventing a filter for it.
const SYSTEM_PROMPT = `You turn a free-text stock-screener query (Bulgarian or English) into structured filters for a small stock database.

Available fields to filter on:
- sectorKeywords: sector/industry keywords to match, e.g. ["Technology", "Software", "Semiconductors"] for "tech" queries.
- nameKeywords: company name or ticker keywords.
- verdicts: any of STRONG BUY, BUY, HOLD, SELL, STRONG SELL. Treat "undervalued" ("подценени") as ["STRONG BUY", "BUY"].
- minAiScore: minimum AI score (0-100), use for phrases like "highly rated" or "strong signals".
- minChangePercent / maxChangePercent: daily price change percent bounds. Use this as the best available proxy for "growth" ("ръст") phrasing, e.g. "growth over 20%" -> minChangePercent: 20. This is a DAILY change, not revenue growth.
- isEtf: true for ETF-only queries, false to exclude ETFs.
- maxExpenseRatioPercent: only meaningful for ETFs, e.g. "low expense ratio" -> a small number like 0.5.

The database has NO data for: debt ratios, insider buying/selling, analyst ratings, revenue/earnings growth, dividend history, or anything not listed above. If the query asks for one of those (or anything else not backed by the fields above), do NOT invent a filter for it — instead add a short phrase describing it (in Bulgarian) to unsupportedCriteria.

Always return every field. Use empty arrays / null where nothing applies. "summary" is one short Bulgarian sentence describing what you searched for, to show the user above the results.`;

const FILTER_SCHEMA = {
  type: 'object',
  properties: {
    sectorKeywords: { type: 'array', items: { type: 'string' } },
    nameKeywords: { type: 'array', items: { type: 'string' } },
    verdicts: {
      type: 'array',
      items: { type: 'string', enum: ['STRONG BUY', 'BUY', 'HOLD', 'SELL', 'STRONG SELL'] },
    },
    minAiScore: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    minChangePercent: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    maxChangePercent: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    isEtf: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
    maxExpenseRatioPercent: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    summary: { type: 'string' },
    unsupportedCriteria: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'sectorKeywords',
    'nameKeywords',
    'verdicts',
    'minAiScore',
    'minChangePercent',
    'maxChangePercent',
    'isEtf',
    'maxExpenseRatioPercent',
    'summary',
    'unsupportedCriteria',
  ],
  additionalProperties: false,
};

async function parseScreenerQuery(query) {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: 'json_schema', schema: FILTER_SCHEMA } },
    messages: [{ role: 'user', content: query }],
  });

  // Let the controller's plain-search fallback handle this rather than
  // trying to recover here — a declined or truncated response has no
  // usable filter JSON either way.
  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined to process this screener query');
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) throw new Error('No filter output returned by Claude');

  return JSON.parse(textBlock.text);
}

module.exports = { parseScreenerQuery };
