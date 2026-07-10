const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const { provisionStock } = require('./stockController');
const { getOrFetchHistory } = require('../services/historyService');
const {
  maxDrawdownPercent,
  correlationBetween,
  weightedAiScore,
  portfolioRiskLevel,
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

async function simulateAddition(req, res, next) {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ message: 'symbol is required' });
    }
    const candidateSymbol = symbol.toUpperCase();

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

    // No specific weight was requested for the candidate — simulate adding
    // it at an illustrative 10% (100% if this is the very first holding),
    // scaling existing positions down proportionally so weights still sum
    // to 100. Clearly labeled to the user as an assumption, not a plan.
    const hasExistingHoldings = positions.length > 0;
    const candidateWeight = hasExistingHoldings ? 10 : 100;
    const scaleFactor = hasExistingHoldings ? 0.9 : 1;

    const afterPositions = [
      ...positions.map((p) => ({ ...p, weight: p.weight * scaleFactor })),
      {
        symbol: candidateSymbol,
        weight: candidateWeight,
        sector: candidateStock.sector || '',
        aiScore: candidateStock.aiScore ?? 50,
        drawdownPercent: candidateDrawdown,
      },
    ];
    const afterAiScore = weightedAiScore(afterPositions);
    const afterRisk = portfolioRiskLevel(afterPositions);

    res.json({
      symbol: candidateSymbol,
      assumedWeightPercent: candidateWeight,
      hasExistingHoldings,
      before: { aiScore: beforeAiScore, riskLevel: beforeRisk },
      after: { aiScore: afterAiScore, riskLevel: afterRisk },
      correlations,
      avgCorrelation,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPortfolio, addHolding, updateHolding, deleteHolding, simulateAddition };
