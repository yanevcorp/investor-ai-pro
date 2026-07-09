const Portfolio = require('../models/Portfolio');

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

module.exports = { getPortfolio, addHolding, updateHolding, deleteHolding };
