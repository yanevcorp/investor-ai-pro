const express = require('express');
const {
  listStocks,
  getStock,
  getStockQuote,
  searchStocks,
  aiSearchStocks,
  getStockHistory,
} = require('../controllers/stockController');

const router = express.Router();

router.get('/', listStocks);
router.get('/search', searchStocks);
router.post('/ai-search', aiSearchStocks);
router.get('/:symbol/history', getStockHistory);
router.get('/:symbol/quote', getStockQuote);
router.get('/:symbol', getStock);

module.exports = router;
