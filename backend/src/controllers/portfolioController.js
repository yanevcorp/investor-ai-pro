const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const { provisionStock } = require('./stockController');
const { getOrFetchHistory } = require('../services/historyService');
const finnhubService = require('../services/finnhubService');
const {
  maxDrawdownPercent,
  correlationBetween,
  weightedAiScore,
  portfolioRiskLevel,
  portfolioRiskScore,
  sectorConcentration,
} = require('../utils/portfolioRisk');

// Bounds how many existing holdings get a fresh correlation calculation —
// each one may cost an Alpha Vantage call (25/day free-tier quota), so a
// large portfolio can't recompute against every position on every simulate.
const MAX_CORRELATION_HOLDINGS = 5;

async function getPortfolio(req, res, next) {
  try {
    let portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) {
      portfolio = await Portfolio.create({ user: req.user._id, holdings: [] });
    }
    res.json({ portfolio });
  } catch (err) {
    next(err);
  }
}

async function addHolding(req, res, next) {
  try {
    const { symbol, weight, value } = req.body;
    if (!symbol || weight == null || value == null) {
      return res.status(400).json({ message: 'symbol, weight and value are required' });
    }

    let portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) {
      portfolio = new Portfolio({ user: req.user._id, holdings: [] });
    }

    const upperSymbol = symbol.toUpperCase();
    const existing = portfolio.holdings.find((h) => h.symbol === upperSymbol);
    if (existing) {
      existing.weight = weight;
      existing.value = value;
    } else {
      portfolio.holdings.push({ symbol: upperSymbol, weight, value });
    }

    await portfolio.save();
    res.status(201).json({ portfolio });
  } catch (err) {
    next(err);
  }
}

async function updateHolding(req, res, next) {
  try {
    const { holdingId } = req.params;
    const { weight, value } = req.body;

    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const holding = portfolio.holdings.id(holdingId);
    if (!holding) {
      return res.status(404).json({ message: 'Holding not found' });
    }

    if (weight != null) holding.weight = weight;
    if (value != null) holding.value = value;

    await portfolio.save();
    res.json({ portfolio });
  } catch (err) {
    next(err);
  }
}

async function deleteHolding(req, res, next) {
  try {
    const { holdingId } = req.params;

    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const holding = portfolio.holdings.id(holdingId);
    if (!holding) {
      return res.status(404).json({ message: 'Holding not found' });
    }

    holding.deleteOne();
    await portfolio.save();
    res.json({ portfolio });
  } catch (err) {
    next(err);
  }
}

// Combines the AI-score delta with the risk-score delta into a single
// plain-language verdict: a score gain that doesn't meaningfully add risk
// is a good addition; a score drop paired with a real risk increase is
// discouraged; anything mixed gets a "proceed carefully" nudge.
function recommendationFor(scoreChange, riskChange) {
  if (scoreChange >= 0 && riskChange <= 5) return 'Добра добавка';
  if (scoreChange < 0 && riskChange > 10) return 'Не препоръчваме';
  return 'Внимавай';
}

async function simulateAddition(req, res, next) {
  try {
    const { symbol, shares } = req.body;
    if (!symbol) {
      return res.status(400).json({ message: 'symbol is required' });
    }
    const candidateSymbol = symbol.toUpperCase();
    const sharesRequested = shares != null && Number(shares) > 0 ? Number(shares) : null;

    const portfolio = await Portfolio.findOne({ user: req.user._id });
    const holdings = portfolio?.holdings || [];

    let candidateStock = await Stock.findOne({ symbol: candidateSymbol });
    if (!candidateStock) {
      candidateStock = await provisionStock(candidateSymbol);
    }
    if (!candidateStock) {
      return res.status(404).json({ message: `Stock ${candidateSymbol} not found` });
    }

    const holdingStocks = await Stock.find({ symbol: { $in: holdings.map((h) => h.symbol) } });
    const stockBySymbol = new Map(holdingStocks.map((s) => [s.symbol, s]));

    const positions = holdings.map((h) => {
      const stockDoc = stockBySymbol.get(h.symbol);
      return {
        symbol: h.symbol,
        weight: h.weight,
        sector: stockDoc?.sector || '',
        aiScore: stockDoc?.aiScore ?? 50,
        drawdownPercent: null,
        stockDoc,
      };
    });

    const candidateHistory = await getOrFetchHistory(candidateStock);
    const candidateDrawdown = maxDrawdownPercent(candidateHistory);

    // Only the largest positions get a fresh correlation + drawdown
    // refresh; smaller ones keep a neutral (unknown) drawdown estimate.
    const topPositions = [...positions].sort((a, b) => b.weight - a.weight).slice(0, MAX_CORRELATION_HOLDINGS);
    const correlations = [];
    for (const pos of topPositions) {
      if (!pos.stockDoc) continue;
      const history = await getOrFetchHistory(pos.stockDoc);
      pos.drawdownPercent = maxDrawdownPercent(history);
      const correlation = correlationBetween(candidateHistory, history);
      correlations.push({ symbol: pos.symbol, correlation });
    }

    const validCorrelations = correlations.filter((c) => c.correlation != null);
    const avgCorrelation =
      validCorrelations.length > 0
        ? Number((validCorrelations.reduce((sum, c) => sum + c.correlation, 0) / validCorrelations.length).toFixed(2))
        : null;

    const beforeAiScore = weightedAiScore(positions);
    const beforeRisk = portfolioRiskLevel(positions);
    const beforeRiskScore = portfolioRiskScore(positions);

    const hasExistingHoldings = positions.length > 0;
    const currentTotalValue = holdings.reduce((sum, h) => sum + (h.value || 0), 0);

    let candidateWeight;
    let scaleFactor;
    if (sharesRequested != null) {
      // A specific share count was given — price it with a live quote (the
      // seeded Stock.price can be stale) and derive the resulting weight
      // from real dollar values instead of an illustrative assumption.
      let price = candidateStock.price;
      try {
        const quote = await finnhubService.getQuote(candidateSymbol);
        price = quote.price;
      } catch (err) {
        // Quote unavailable/rate-limited — fall back to the last known price.
      }
      const candidateValue = sharesRequested * price;
      const newTotalValue = currentTotalValue + candidateValue;
      candidateWeight = newTotalValue > 0 ? (candidateValue / newTotalValue) * 100 : 100;
      scaleFactor = newTotalValue > 0 ? currentTotalValue / newTotalValue : 0;
    } else {
      // No share count given — simulate adding at an illustrative 10% (100%
      // if this is the very first holding), scaling existing positions down
      // proportionally so weights still sum to 100. Clearly labeled to the
      // user as an assumption, not a plan.
      candidateWeight = hasExistingHoldings ? 10 : 100;
      scaleFactor = hasExistingHoldings ? 0.9 : 1;
    }

    const candidateSector = candidateStock.sector || '';
    const afterPositions = [
      ...positions.map((p) => ({ ...p, weight: p.weight * scaleFactor })),
      {
        symbol: candidateSymbol,
        weight: candidateWeight,
        sector: candidateSector,
        aiScore: candidateStock.aiScore ?? 50,
        drawdownPercent: candidateDrawdown,
      },
    ];
    const afterAiScore = weightedAiScore(afterPositions);
    const afterRisk = portfolioRiskLevel(afterPositions);
    const afterRiskScore = portfolioRiskScore(afterPositions);

    const sectorKey = candidateSector || 'Друго';
    const sectorWeightBefore = sectorConcentration(positions).find((s) => s.sector === sectorKey)?.weightPercent ?? 0;
    const sectorWeightAfter = sectorConcentration(afterPositions).find((s) => s.sector === sectorKey)?.weightPercent ?? 0;

    const scoreChange = beforeAiScore != null && afterAiScore != null ? afterAiScore - beforeAiScore : 0;
    const riskChange = afterRiskScore - beforeRiskScore;

    res.json({
      symbol: candidateSymbol,
      sharesRequested,
      assumedWeightPercent: Number(candidateWeight.toFixed(1)),
      hasExistingHoldings,
      before: { aiScore: beforeAiScore, riskLevel: beforeRisk, riskScore: beforeRiskScore },
      after: { aiScore: afterAiScore, riskLevel: afterRisk, riskScore: afterRiskScore },
      currentScore: beforeAiScore,
      newScore: afterAiScore,
      riskChange,
      correlations,
      avgCorrelation,
      correlation: avgCorrelation,
      sectorConcentration: {
        sector: sectorKey,
        before: sectorWeightBefore,
        after: Number(sectorWeightAfter.toFixed(1)),
        change: Number((sectorWeightAfter - sectorWeightBefore).toFixed(1)),
      },
      recommendation: recommendationFor(scoreChange, riskChange),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPortfolio, addHolding, updateHolding, deleteHolding, simulateAddition };
