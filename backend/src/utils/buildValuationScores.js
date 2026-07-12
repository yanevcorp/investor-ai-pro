const { avNumber } = require('./numbers');

// Heuristic 0-100 scores in the spirit of Simply Wall St's score cards —
// not a real quantitative research product, just a transparent, documented
// formula over data this app already has (same philosophy as the existing
// verdict/aiScore in buildAnalysis.js). Each category returns null (shown
// as N/A by the frontend) when the underlying data isn't available, rather
// than guessing.
function clampScore(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function latestOf(series) {
  return Array.isArray(series) && series.length > 0 ? series[series.length - 1] : null;
}

function profitability(financialsHistory, fundamentals) {
  const latestMargin = latestOf(financialsHistory?.marginsHistory);
  const overviewMargin = avNumber(fundamentals?.ProfitMargin);
  const netMarginPercent = latestMargin?.netMarginPercent ?? (overviewMargin !== null ? overviewMargin * 100 : null);
  if (netMarginPercent === null) return { score: null, detail: [] };

  return {
    score: clampScore(50 + netMarginPercent * 2),
    detail: [
      { label: 'Нетен марж', value: `${netMarginPercent.toFixed(1)}%`, positive: netMarginPercent > 10 },
      ...(latestMargin?.grossMarginPercent != null
        ? [{ label: 'Брутен марж', value: `${latestMargin.grossMarginPercent.toFixed(1)}%`, positive: latestMargin.grossMarginPercent > 40 }]
        : []),
    ],
  };
}

function growth(financialsHistory) {
  const latestRevenue = latestOf(financialsHistory?.revenueHistory);
  const latestEps = latestOf(financialsHistory?.epsHistory);
  const rates = [latestRevenue?.growthPercent, latestEps?.growthPercent].filter((v) => v !== null && v !== undefined);
  if (rates.length === 0) return { score: null, detail: [] };

  const avgGrowth = rates.reduce((s, v) => s + v, 0) / rates.length;
  return {
    score: clampScore(50 + avgGrowth * 1.5),
    detail: [
      ...(latestRevenue?.growthPercent != null
        ? [{ label: 'Ръст на приходите (г/г)', value: `${latestRevenue.growthPercent >= 0 ? '+' : ''}${latestRevenue.growthPercent.toFixed(1)}%`, positive: latestRevenue.growthPercent > 0 }]
        : []),
      ...(latestEps?.growthPercent != null
        ? [{ label: 'Ръст на EPS (г/г)', value: `${latestEps.growthPercent >= 0 ? '+' : ''}${latestEps.growthPercent.toFixed(1)}%`, positive: latestEps.growthPercent > 0 }]
        : []),
    ],
  };
}

function financialHealth(financialsHistory) {
  const latestDebtCash = latestOf(financialsHistory?.debtVsCashHistory);
  const debt = latestDebtCash?.debt;
  const cash = latestDebtCash?.cash;
  if (debt == null && cash == null) return { score: null, detail: [] };

  const d = debt || 0;
  const c = cash || 0;
  const netPositionRatio = d + c > 0 ? (c - d) / (d + c) : 0;
  return {
    score: clampScore(50 + netPositionRatio * 50),
    detail: [
      { label: 'Дълг', value: debt != null ? formatMoney(debt) : 'N/A', positive: debt != null && debt < c },
      { label: 'Кеш', value: cash != null ? formatMoney(cash) : 'N/A', positive: true },
    ],
  };
}

function dividends(fundamentals) {
  const yieldValue = avNumber(fundamentals?.DividendYield) ?? avNumber(fundamentals?.dividend_yield);
  if (yieldValue === null) return { score: null, detail: [] };
  const yieldPercent = yieldValue * 100;
  return {
    score: clampScore(yieldPercent * 20),
    detail: [{ label: 'Дивидентна доходност', value: `${yieldPercent.toFixed(2)}%`, positive: yieldPercent > 1.5 }],
  };
}

function analyst(analystRatings) {
  if (!analystRatings || !analystRatings.totalAnalysts) return { score: null, detail: [] };
  const { strongBuy, buy, hold, sell, strongSell, totalAnalysts } = analystRatings;
  const weighted = strongBuy * 100 + buy * 75 + hold * 50 + sell * 25 + strongSell * 0;
  return {
    score: clampScore(weighted / totalAnalysts),
    detail: [
      { label: 'Strong Buy / Buy', value: `${strongBuy + buy} от ${totalAnalysts}`, positive: strongBuy + buy > totalAnalysts / 2 },
      { label: 'Sell / Strong Sell', value: `${sell + strongSell} от ${totalAnalysts}`, positive: sell + strongSell < totalAnalysts / 4 },
    ],
  };
}

// No dedicated "management quality" data source exists — ROE (return on
// equity) is used as the proxy, same as many simplified scoring tools use,
// and is labeled as such in the detail so it isn't mistaken for a genuine
// qualitative assessment.
function management(fundamentals) {
  const roe = avNumber(fundamentals?.ReturnOnEquityTTM);
  if (roe === null) return { score: null, detail: [] };
  const roePercent = roe * 100;
  return {
    score: clampScore(50 + roePercent * 1.5),
    detail: [{ label: 'ROE (проксиметрика за управление)', value: `${roePercent.toFixed(1)}%`, positive: roePercent > 15 }],
  };
}

function formatMoney(n) {
  if (n === null || n === undefined) return 'N/A';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function buildValuationScores(stockObj, fundamentals) {
  return {
    management: management(fundamentals),
    financialHealth: financialHealth(stockObj.financialsHistory),
    growth: growth(stockObj.financialsHistory),
    profitability: profitability(stockObj.financialsHistory, fundamentals),
    dividends: dividends(fundamentals),
    analyst: analyst(stockObj.analystRatings),
  };
}

module.exports = { buildValuationScores };
