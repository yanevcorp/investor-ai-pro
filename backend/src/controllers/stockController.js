const Stock = require('../models/Stock');

async function listStocks(req, res, next) {
  try {
    const { sector, verdict, search } = req.query;
    const filter = {};
    if (sector) filter.sector = sector;
    if (verdict) filter.verdict = verdict;
    if (search) {
      filter.$or = [{ symbol: new RegExp(search, 'i') }, { name: new RegExp(search, 'i') }];
    }

    const stocks = await Stock.find(filter).select('-analysis').sort('symbol');
    res.json({ count: stocks.length, stocks });
  } catch (err) {
    next(err);
  }
}

async function getStock(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const stock = await Stock.findOne({ symbol });
    if (!stock) {
      return res.status(404).json({ message: `Stock ${symbol} not found` });
    }
    res.json({ stock });
  } catch (err) {
    next(err);
  }
}

module.exports = { listStocks, getStock };
