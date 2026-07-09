const Stock = require('../models/Stock');
const finnhubService = require('../services/finnhubService');
const alphaVantageService = require('../services/alphaVantageService');
const newsService = require('../services/newsService');
const { buildGenericAnalysis } = require('../utils/buildAnalysis');

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

async function getFundamentals(stock) {
  if (stock.fundamentals) return stock.fundamentals;
  try {
    const fundamentals = await alphaVantageService.getOverview(stock.symbol);
    stock.fundamentals = fundamentals;
    stock.fundamentalsFetchedAt = new Date();
    await stock.save();
    return fundamentals;
  } catch (err) {
    return null;
  }
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

  return Stock.create({
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

    try {
      const quote = await finnhubService.getQuote(symbol);
      obj.price = quote.price;
      obj.change = quote.change;
      obj.changePercent = quote.changePercent;
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

    const fundamentals = await getFundamentals(stock);
    if (fundamentals) {
      obj.analysis = obj.analysis || {};
      obj.analysis.overview = buildOverviewFromFundamentals(fundamentals);
      obj.analysis.financials = buildFinancialsFromFundamentals(fundamentals);
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

module.exports = { listStocks, getStock };
