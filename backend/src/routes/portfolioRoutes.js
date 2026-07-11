const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const {
  getPortfolio,
  addHolding,
  updateHolding,
  deleteHolding,
  simulateAddition,
} = require('../controllers/portfolioController');
const { getBottlenecks } = require('../controllers/bottleneckController');

const router = express.Router();

router.use(optionalAuth);

router.get('/', getPortfolio);
router.post('/', addHolding);
router.post('/simulate', simulateAddition);
router.get('/bottlenecks', getBottlenecks);
router.put('/:holdingId', updateHolding);
router.delete('/:holdingId', deleteHolding);

module.exports = router;
