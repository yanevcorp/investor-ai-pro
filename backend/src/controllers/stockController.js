const Stock = require('../models/Stock');
const finnhubService = require('../services/finnhubService');
const alphaVantageService = require('../services/alphaVantageService');
const newsService = require('../services/newsService');
const anthropicService = require('../services/anthropicService');
const { buildGenericAnalysis } = require('../utils/buildAnalysis');
const { isEtfSymbol } = require('../utils/etf');
const { getMarketSession } = require('../utils/marketSession');
const { getOrFetchHistory } = require('../services/historyService');
const { sparklineFrom, maxDrawdownPercent } = require('../utils/portfolioRisk');

// Finnhub's /search endpoint doesn't return an exchange field, but foreign
// listings carry a dot-suffix on the symbol (e.g. "2788.T", "603020.SS")
// that reliably identifies the exchange — a plain symbol with no suffix is
// always a US listing. Used to label search results without guessing.
const EXCHANGE_SUFFIXES = {
  T: 'Tokyo',
  SS: 'Shanghai',
  SZ: 'Shenzhen',
  HK: 'Hong Kong',
  L: 'London',
  TO: 'Toronto',
  V: 'TSX Venture',
  DE: 'Xetra',
  PA: 'Paris',
  AS: 'Amsterdam',
  MI: 'Milan',
  SW: 'Swiss',
  KL: 'Kuala Lumpur',
  AX: 'Australia',
  NS: 'NSE India',
  BO: 'BSE India',
};

function exchangeFromSymbol(symbol) {
  const parts = String(symbol || '').split('.');
  if (parts.length < 2) return 'US';
  const suffix = parts[parts.length - 1].toUpperCase();
  return EXCHANGE_SUFFIXES[suffix] || suffix;
}

function avNumber(value) {
  if (value === undefined || value === null || value === 'None' || value === '-') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function formatMoney(n) {
  if (n === null) return 'N/A';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function buildOverviewFromFundamentals(f) {
  const pe = avNumber(f.PERatio);
  const beta = avNumber(f.Beta);
  const marketCap = avNumber(f.MarketCapitalization);
  const low52 = avNumber(f['52WeekLow']);
  const high52 = avNumber(f['52WeekHigh']);
  const dividendYield = avNumber(f.DividendYield);

  return [
    { label: 'Пазарна капитализация', value: formatMoney(marketCap), good: true },
    { label: 'P/E съотношение', value: pe !== null ? pe.toFixed(2) : 'N/A', good: pe !== null && pe > 0 && pe < 30 },
    {
      label: '52-седмичен диапазон',
      value: low52 !== null && high52 !== null ? `$${low52.toFixed(2)} - $${high52.toFixed(2)}` : 'N/A',
      good: true,
    },
    { label: 'Бета', value: beta !== null ? beta.toFixed(2) : 'N/A', good: beta !== null && beta < 1.5 },
    {
      label: 'Дивидентна доходност',
      value: dividendYield ? `${(dividendYield * 100).toFixed(2)}%` : 'Няма',
      good: true,
    },
  ];
}

function buildFinancialsFromFundamentals(f) {
  const revenueTTM = avNumber(f.RevenueTTM);
  const revGrowth = avNumber(f.QuarterlyRevenueGrowthYOY);
  const profitMargin = avNumber(f.ProfitMargin);
  const eps = avNumber(f.EPS);
  const roe = avNumber(f.ReturnOnEquityTTM);

  return [
    { label: 'Приходи (TTM)', value: formatMoney(revenueTTM), good: true },
    {
      label: 'Ръст на приходите YoY',
      value: revGrowth !== null ? `${revGrowth >= 0 ? '+' : ''}${(revGrowth * 100).toFixed(1)}%` : 'N/A',
      good: revGrowth !== null && revGrowth > 0,
    },
    {
      label: 'Марж на печалба',
      value: profitMargin !== null ? `${(profitMargin * 100).toFixed(1)}%` : 'N/A',
      good: profitMargin !== null && profitMargin > 0.1,
    },
    { label: 'EPS', value: eps !== null ? eps.toFixed(2) : 'N/A', good: eps !== null && eps > 0 },
    {
      label: 'ROE',
      value: roe !== null ? `${(roe * 100).toFixed(1)}%` : 'N/A',
      good: roe !== null && roe > 0.1,
    },
  ];
}

function buildEtfOverview(etf) {
  const netAssets = avNumber(etf.net_assets);
  const expenseRatio = avNumber(etf.net_expense_ratio);
  const dividendYield = avNumber(etf.dividend_yield);

  return [
    { label: 'Нетни активи', value: formatMoney(netAssets), good: true },
    {
      label: 'Разходен коефициент (TER)',
      value: expenseRatio !== null ? `${(expenseRatio * 100).toFixed(2)}%` : 'N/A',
      good: expenseRatio !== null && expenseRatio < 0.005,
    },
    {
      label: 'Дивидентна доходност',
      value: dividendYield ? `${(dividendYield * 100).toFixed(2)}%` : 'Няма',
      good: true,
    },
    { label: 'Ливъридж', value: etf.leveraged === 'YES' ? 'Да' : 'Не', good: etf.leveraged !== 'YES' },
    { label: 'Дата на стартиране', value: etf.inception_date || 'N/A', good: true },
  ];
}

function buildEtfHoldings(etf) {
  const holdings = Array.isArray(etf.holdings) ? etf.holdings.slice(0, 10) : [];
  if (holdings.length === 0) {
    return [{ label: 'Позиции', value: 'N/A', good: true }];
  }
  return holdings.map((h) => {
    const weight = avNumber(h.weight);
    return {
      label: h.description || h.symbol || '—',
      value: weight !== null ? `${(weight * 100).toFixed(2)}%` : 'N/A',
      good: true,
    };
  });
}

async function getFundamentals(stock, isEtf) {
  if (stock.fundamentals) return stock.fundamentals;
  try {
    const fundamentals = isEtf
      ? await alphaVantageService.getEtfProfile(stock.symbol)
      : await alphaVantageService.getOverview(stock.symbol);
    stock.fundamentals = fundamentals;
    stock.fundamentalsFetchedAt = new Date();
    await stock.save();
    return fundamentals;
  } catch (err) {
    return null;
  }
}

// Finnhub's free-tier /quote has no dedicated pre-market/after-hours price
// field (see utils/marketSession.js) — `c` already tracks the latest trade
// including extended-hours activity, and `d`/`dp` are already computed off
// that same trade vs. the prior session's close. So "extended price" reuses
// those fields rather than fabricating a second number, and is only
// surfaced (session-labeled, with a last-trade timestamp) when the current
// session is actually pre-market or after-hours.
function buildExtendedPrice(quote, marketSession) {
  if (marketSession !== 'pre-market' && marketSession !== 'after-hours') return null;
  if (typeof quote?.price !== 'number') return null;
  return {
    session: marketSession,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    asOf: quote.timestamp || null,
  };
}

function deriveVerdict(changePercent) {
  if (changePercent >= 10) return 'STRONG BUY';
  if (changePercent >= 2) return 'BUY';
  if (changePercent > -2) return 'HOLD';
  if (changePercent > -10) return 'SELL';
  return 'STRONG SELL';
}

function deriveAiScore(changePercent) {
  return Math.max(0, Math.min(100, Math.round(50 + changePercent * 2)));
}

// Any ticker not already in Mongo is looked up live via Finnhub. A
// successful quote (non-zero price) is treated as proof it's a real,
// tradable symbol, and gets persisted so it behaves like a seeded stock
// from then on (fundamentals caching, watchlist/portfolio references,
// future search hits, etc.). Verdict/aiScore/analysis are heuristic —
// there's no genuine AI thesis behind them, same as the seeded stocks.
async function provisionStock(symbol) {
  let quote;
  try {
    quote = await finnhubService.getQuote(symbol);
  } catch (err) {
    return null;
  }

  let profile = null;
  try {
    profile = await finnhubService.getProfile(symbol);
  } catch (err) {
    // Profile is a nice-to-have — the quote alone already confirms this
    // is a real symbol.
  }

  const verdict = deriveVerdict(quote.changePercent);
  const positive = verdict === 'STRONG BUY' || verdict === 'BUY';

  try {
    return await Stock.create({
      symbol,
      name: profile?.name || symbol,
      sector: profile?.sector || '',
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      verdict,
      aiScore: deriveAiScore(quote.changePercent),
      analysis: buildGenericAnalysis(positive),
    });
  } catch (err) {
    // Two concurrent requests discovering the same new symbol can race on
    // the unique index — whoever loses just reads what the winner wrote.
    const existing = await Stock.findOne({ symbol });
    if (existing) return existing;
    throw err;
  }
}

async function listStocks(req, res, next) {
  try {
    const { sector, verdict, search } = req.query;
    const filter = {};
    if (sector) filter.sector = sector;
    if (verdict) filter.verdict = verdict;
    if (search) {
      filter.$or = [{ symbol: new RegExp(search, 'i') }, { name: new RegExp(search, 'i') }];
    }

    let stocks = await Stock.find(filter).select('-analysis').sort('symbol');

    // No local match on what looks like a bare ticker (e.g. "KTOS")?
    // Try discovering it live instead of returning an empty result.
    if (search && stocks.length === 0) {
      const candidate = search.trim().toUpperCase();
      if (/^[A-Z.]{1,6}$/.test(candidate)) {
        const provisioned = await provisionStock(candidate);
        if (provisioned) stocks = [provisioned];
      }
    }

    const withLiveQuotes = await Promise.all(
      stocks.map(async (stockDoc) => {
        const obj = typeof stockDoc.toObject === 'function' ? stockDoc.toObject() : stockDoc;
        delete obj.analysis;
        try {
          const quote = await finnhubService.getQuote(obj.symbol);
          obj.price = quote.price;
          obj.change = quote.change;
          obj.changePercent = quote.changePercent;
        } catch (err) {
          // Finnhub unavailable/rate-limited — keep the seeded/provisioned fallback values
        }
        return obj;
      })
    );

    res.json({ count: withLiveQuotes.length, stocks: withLiveQuotes });
  } catch (err) {
    next(err);
  }
}

async function getStock(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    let stock = await Stock.findOne({ symbol });

    if (!stock) {
      stock = await provisionStock(symbol);
      if (!stock) {
        return res.status(404).json({ message: `Stock ${symbol} not found` });
      }
    }

    const obj = stock.toObject();
    const isEtf = isEtfSymbol(symbol);
    obj.isEtf = isEtf;
    obj.marketSession = getMarketSession();

    try {
      const quote = await finnhubService.getQuote(symbol);
      obj.price = quote.price;
      obj.change = quote.change;
      obj.changePercent = quote.changePercent;
      obj.previousClose = quote.previousClose;
      obj.extendedPrice = buildExtendedPrice(quote, obj.marketSession);
    } catch (err) {
      // keep seeded/provisioned fallback
    }

    try {
      const profile = await finnhubService.getProfile(symbol);
      obj.name = profile.name || obj.name;
      obj.sector = profile.sector || obj.sector;
    } catch (err) {
      // keep seeded/provisioned fallback
    }

    const fundamentals = await getFundamentals(stock, isEtf);
    if (fundamentals) {
      obj.analysis = obj.analysis || {};
      if (isEtf) {
        obj.analysis.overview = buildEtfOverview(fundamentals);
        obj.analysis.financials = buildEtfHoldings(fundamentals);
      } else {
        obj.analysis.overview = buildOverviewFromFundamentals(fundamentals);
        obj.analysis.financials = buildFinancialsFromFundamentals(fundamentals);
      }
    }

    try {
      obj.analysis = obj.analysis || {};
      obj.analysis.news = await newsService.getCompanyNews(obj.name || symbol, symbol);
    } catch (err) {
      obj.analysis = obj.analysis || {};
      obj.analysis.news = [];
    }

    res.json({ stock: obj });
  } catch (err) {
    next(err);
  }
}

// Lightweight companion to getStock, for pages that poll for a live price
// every 30-60s (AnalysisPage, Watchlist) — returns just the quote fields
// instead of the full analysis payload (fundamentals, news, XAI reasons),
// so frequent polling doesn't re-fetch/re-serialize all of that on every
// tick.
async function getStockQuote(req, res, next) {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const quote = await finnhubService.getQuote(symbol);
    const marketSession = getMarketSession();
    res.json({
      symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      previousClose: quote.previousClose,
      marketSession,
      extendedPrice: buildExtendedPrice(quote, marketSession),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ message: `No live quote available for ${symbol}` });
  }
}

async function searchStocks(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ results: [] });

    const raw = await finnhubService.searchSymbols(q);
    const results = raw.slice(0, 8).map((r) => {
      const symbol = r.displaySymbol || r.symbol;
      return {
        symbol,
        name: r.description || '',
        type: r.type || '',
        exchange: exchangeFromSymbol(symbol),
        isEtf: isEtfSymbol(symbol) || r.type === 'ETP',
      };
    });

    res.json({ results });
  } catch (err) {
    // A flaky/rate-limited search should degrade to "no suggestions",
    // not break the page the search bar lives on.
    res.json({ results: [] });
  }
}

// Natural-language screener: Claude turns free-text queries (e.g. "Намери
// подценени tech компании с дълг под 20%") into structured filters that get
// applied against the Stock collection. Falls back to a plain symbol/name
// regex match — same behavior as listStocks's search param — if Claude is
// unavailable (no API key configured, rate-limited, etc.), so the endpoint
// degrades instead of breaking the screener page.
async function aiSearchStocks(req, res, next) {
  try {
    const query = String(req.body?.query || req.query.query || '').trim();
    if (!query) return res.json({ count: 0, stocks: [], summary: '', unsupportedCriteria: [] });

    let filters = null;
    try {
      filters = await anthropicService.parseScreenerQuery(query);
    } catch (err) {
      filters = null;
    }

    const mongoFilter = {};
    if (filters) {
      const or = [];
      (filters.sectorKeywords || []).forEach((kw) => kw && or.push({ sector: new RegExp(kw, 'i') }));
      (filters.nameKeywords || []).forEach((kw) => {
        if (!kw) return;
        or.push({ name: new RegExp(kw, 'i') }, { symbol: new RegExp(kw, 'i') });
      });
      if (or.length) mongoFilter.$or = or;
      if (Array.isArray(filters.verdicts) && filters.verdicts.length) {
        mongoFilter.verdict = { $in: filters.verdicts };
      }
      if (typeof filters.minAiScore === 'number') mongoFilter.aiScore = { $gte: filters.minAiScore };
      if (typeof filters.minChangePercent === 'number' || typeof filters.maxChangePercent === 'number') {
        mongoFilter.changePercent = {};
        if (typeof filters.minChangePercent === 'number') mongoFilter.changePercent.$gte = filters.minChangePercent;
        if (typeof filters.maxChangePercent === 'number') mongoFilter.changePercent.$lte = filters.maxChangePercent;
      }
    } else {
      mongoFilter.$or = [{ symbol: new RegExp(query, 'i') }, { name: new RegExp(query, 'i') }];
    }

    let stocks = await Stock.find(mongoFilter).select('-analysis').limit(50).sort('-aiScore');

    // isEtf and expense ratio aren't queryable Mongo fields (isEtf is
    // derived from the symbol; expense ratio lives inside the cached
    // fundamentals blob), so those two filter in-memory after the DB query.
    if (filters?.isEtf === true) stocks = stocks.filter((s) => isEtfSymbol(s.symbol));
    if (filters?.isEtf === false) stocks = stocks.filter((s) => !isEtfSymbol(s.symbol));
    if (typeof filters?.maxExpenseRatioPercent === 'number') {
      stocks = stocks.filter((s) => {
        const ratio = avNumber(s.fundamentals?.net_expense_ratio);
        return ratio === null ? true : ratio * 100 <= filters.maxExpenseRatioPercent;
      });
    }

    stocks = stocks.slice(0, 20);

    const withLiveQuotes = await Promise.all(
      stocks.map(async (stockDoc) => {
        const obj = stockDoc.toObject();
        delete obj.analysis;
        delete obj.fundamentals;
        try {
          const quote = await finnhubService.getQuote(obj.symbol);
          obj.price = quote.price;
          obj.change = quote.change;
          obj.changePercent = quote.changePercent;
        } catch (err) {
          // Finnhub unavailable/rate-limited — keep the stored fallback values
        }
        return obj;
      })
    );

    res.json({
      count: withLiveQuotes.length,
      stocks: withLiveQuotes,
      summary: filters?.summary || '',
      unsupportedCriteria: filters?.unsupportedCriteria || [],
    });
  } catch (err) {
    next(err);
  }
}

async function getStockHistory(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    let stock = await Stock.findOne({ symbol });

    if (!stock) {
      stock = await provisionStock(symbol);
      if (!stock) {
        return res.status(404).json({ message: `Stock ${symbol} not found` });
      }
    }

    const history = await getOrFetchHistory(stock);
    res.json({
      symbol,
      sparkline: sparklineFrom(history, 7),
      history,
      drawdownPercent: maxDrawdownPercent(history),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listStocks,
  getStock,
  getStockQuote,
  searchStocks,
  aiSearchStocks,
  getStockHistory,
  provisionStock,
};
