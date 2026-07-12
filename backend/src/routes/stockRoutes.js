const express = require('express');
const {
  listStocks,
  getStock,
  getStockQuote,
  searchStocks,
  aiSearchStocks,
  getStockHistory,
  getStockOhlc,
  getStockEarnings,
  getStockInsider,
} = require('../controllers/stockController');

const router = express.Router();

router.get('/', listStocks);
router.get('/search', searchStocks);
router.post('/ai-search', aiSearchStocks);
router.get('/:symbol/history', getStockHistory);
router.get('/:symbol/ohlc', getStockOhlc);
router.get('/:symbol/earnings', getStockEarnings);
router.get('/:symbol/insider', getStockInsider);
router.get('/:symbol/quote', getStockQuote);
router.get('/:symbol', getStock);

module.exports = router;
