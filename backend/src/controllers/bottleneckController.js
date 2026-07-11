const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const { getOrFetchHistory } = require('../services/historyService');
const { maxDrawdownPercent, correlationBetween, weightedAiScore } = require('../utils/portfolioRisk');

// Same quota reasoning as portfolioController.simulateAddition — only the
// largest positions get a fresh correlation/drawdown refresh.
const MAX_CORRELATION_HOLDINGS = 5;
const MAX_BOTTLENECKS = 3;
const MAX_ALTERNATIVES = 3;

async function getBottlenecks(req, res, next) {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user._id });
    const holdings = portfolio?.holdings || [];

    if (holdings.length === 0) {
      return res.json({ bottlenecks: [], portfolioAiScore: null });
    }

    const stockDocs = await Stock.find({ symbol: { $in: holdings.map((h) => h.symbol) } });
    const stockBySymbol = new Map(stockDocs.map((s) => [s.symbol, s]));

    const positions = holdings.map((h) => {
      const stockDoc = stockBySymbol.get(h.symbol);
      return {
        symbol: h.symbol,
        weight: h.weight,
        sector: stockDoc?.sector || '',
        aiScore: stockDoc?.aiScore ?? 50,
        stockDoc,
        drawdownPercent: null,
      };
    });

    const portfolioAiScore = weightedAiScore(positions);

    const topPositions = [...positions].sort((a, b) => b.weight - a.weight).slice(0, MAX_CORRELATION_HOLDINGS);
    const historyBySymbol = new Map();
    for (const pos of topPositions) {
      if (!pos.stockDoc) continue;
      const history = await getOrFetchHistory(pos.stockDoc);
      historyBySymbol.set(pos.symbol, history);
      pos.drawdownPercent = maxDrawdownPercent(history);
    }

    // Average pairwise correlation against other scored holdings — a proxy
    // for redundancy (a stock that just duplicates the rest of the portfolio).
    const scoredSymbols = [...historyBySymbol.keys()];
    const avgCorrelationBySymbol = new Map();
    for (const symbol of scoredSymbols) {
      const correlations = scoredSymbols
        .filter((s) => s !== symbol)
        .map((other) => correlationBetween(historyBySymbol.get(symbol), historyBySymbol.get(other)))
        .filter((c) => c != null);
      avgCorrelationBySymbol.set(
        symbol,
        correlations.length > 0 ? correlations.reduce((sum, c) => sum + c, 0) / correlations.length : null
      );
    }

    const scored = positions.map((pos) => {
      const avgCorrelation = avgCorrelationBySymbol.get(pos.symbol) ?? null;
      const drawdown = pos.drawdownPercent;
      const riskRewardRatio = drawdown && drawdown > 0 ? pos.aiScore / drawdown : null;

      const lowScorePenalty = Math.max(0, 60 - pos.aiScore) * 0.5; // worse below "hold" threshold
      const weightPenalty = pos.weight >= 30 ? 20 : pos.weight >= 15 ? 10 : 0;
      const correlationPenalty =
        avgCorrelation != null && avgCorrelation >= 0.6 ? 15 : avgCorrelation != null && avgCorrelation >= 0.4 ? 8 : 0;
      const riskRewardPenalty =
        riskRewardRatio != null && riskRewardRatio < 2 ? 15 : riskRewardRatio != null && riskRewardRatio < 4 ? 7 : 0;

      const bottleneckScore = Math.round(lowScorePenalty + weightPenalty + correlationPenalty + riskRewardPenalty);

      const reasons = [];
      if (pos.aiScore < 50) reasons.push(`Нисък AI резултат (${pos.aiScore}/100)`);
      if (pos.weight >= 15) reasons.push(`Голямо тегло в портфолиото (${pos.weight}%)`);
      if (avgCorrelation != null && avgCorrelation >= 0.4) {
        reasons.push(`Висока корелация с други позиции (${avgCorrelation.toFixed(2)}) — дублира риск`);
      }
      if (riskRewardRatio != null && riskRewardRatio < 4) {
        reasons.push(`Слабо съотношение риск/възвращаемост (${riskRewardRatio.toFixed(1)})`);
      }
      if (reasons.length === 0) reasons.push('Под-среден принос към общия резултат на портфолиото.');

      return {
        symbol: pos.symbol,
        weight: pos.weight,
        aiScore: pos.aiScore,
        sector: pos.sector,
        avgCorrelation: avgCorrelation != null ? Number(avgCorrelation.toFixed(2)) : null,
        drawdownPercent: drawdown,
        riskRewardRatio: riskRewardRatio != null ? Number(riskRewardRatio.toFixed(2)) : null,
        bottleneckScore,
        reasons,
      };
    });

    const ranked = scored
      .filter((s) => s.bottleneckScore > 0)
      .sort((a, b) => b.bottleneckScore - a.bottleneckScore)
      .slice(0, MAX_BOTTLENECKS);

    const heldSymbols = positions.map((p) => p.symbol);
    const bottlenecks = [];
    for (const item of ranked) {
      const alternatives = await Stock.find({
        sector: item.sector,
        symbol: { $nin: heldSymbols },
        aiScore: { $gt: item.aiScore },
      })
        .sort({ aiScore: -1 })
        .limit(MAX_ALTERNATIVES)
        .select('symbol name aiScore verdict sector -_id');

      // Points the portfolio's weighted AI score would gain if this holding
      // were removed (its weight redistributed across the rest) — i.e. how
      // much it is currently dragging the overall score down.
      const withoutHolding = positions.filter((p) => p.symbol !== item.symbol);
      const scoreWithout = weightedAiScore(withoutHolding);
      const impact = portfolioAiScore != null && scoreWithout != null ? scoreWithout - portfolioAiScore : null;

      bottlenecks.push({
        symbol: item.symbol,
        weight: item.weight,
        aiScore: item.aiScore,
        sector: item.sector,
        bottleneckScore: item.bottleneckScore,
        reasons: item.reasons,
        impact,
        alternatives,
      });
    }

    res.json({ bottlenecks, portfolioAiScore });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBottlenecks };
