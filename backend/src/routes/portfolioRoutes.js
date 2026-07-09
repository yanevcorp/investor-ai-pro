const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getPortfolio,
  addHolding,
  updateHolding,
  deleteHolding,
} = require('../controllers/portfolioController');

const router = express.Router();

router.use(protect);

router.get('/', getPortfolio);
router.post('/', addHolding);
router.put('/:holdingId', updateHolding);
router.delete('/:holdingId', deleteHolding);

module.exports = router;
