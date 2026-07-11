function sparklineFrom(history, points = 7) {
  if (!Array.isArray(history) || history.length === 0) return [];
  return history.slice(-points).map((p) => p.close);
}

// Largest peak-to-trough decline in the series, as a positive percentage.
function maxDrawdownPercent(history) {
  if (!Array.isArray(history) || history.length < 2) return null;
  let peak = history[0].close;
  let worst = 0;
  for (const point of history) {
    if (point.close > peak) peak = point.close;
    const drawdown = ((peak - point.close) / peak) * 100;
    if (drawdown > worst) worst = drawdown;
  }
  return Number(worst.toFixed(2));
}

function dailyReturns(history) {
  if (!Array.isArray(history) || history.length < 2) return [];
  const returns = [];
  for (let i = 1; i < history.length; i += 1) {
    const prev = history[i - 1].close;
    const curr = history[i].close;
    if (prev > 0) returns.push((curr - prev) / prev);
  }
  return returns;
}

// Pearson correlation over the two series' *overlapping* trading days by
// date, since two symbols' cached histories won't always share the exact
// same date range (different IPO dates, fetch timing, etc.).
function correlationBetween(historyA, historyB) {
  if (!Array.isArray(historyA) || !Array.isArray(historyB)) return null;

  const closesByDateB = new Map(historyB.map((p) => [p.date, p.close]));
  const aligned = historyA
    .filter((p) => closesByDateB.has(p.date))
    .map((p) => ({ date: p.date, a: p.close, b: closesByDateB.get(p.date) }))
    .sort((x, y) => x.date.localeCompare(y.date));

  if (aligned.length < 10) return null; // too little overlap to mean anything

  const returnsA = [];
  const returnsB = [];
  for (let i = 1; i < aligned.length; i += 1) {
    if (aligned[i - 1].a > 0) returnsA.push((aligned[i].a - aligned[i - 1].a) / aligned[i - 1].a);
    if (aligned[i - 1].b > 0) returnsB.push((aligned[i].b - aligned[i - 1].b) / aligned[i - 1].b);
  }
  if (returnsA.length !== returnsB.length || returnsA.length < 5) return null;

  const meanA = returnsA.reduce((s, v) => s + v, 0) / returnsA.length;
  const meanB = returnsB.reduce((s, v) => s + v, 0) / returnsB.length;

  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < returnsA.length; i += 1) {
    const da = returnsA[i] - meanA;
    const db = returnsB[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  if (varA === 0 || varB === 0) return null;

  const correlation = cov / Math.sqrt(varA * varB);
  return Number(correlation.toFixed(2));
}

function riskLevelFor({ weightPercent, drawdownPercent }) {
  const weightScore = weightPercent >= 30 ? 2 : weightPercent >= 15 ? 1 : 0;
  const drawdownScore = drawdownPercent == null ? 1 : drawdownPercent >= 35 ? 2 : drawdownPercent >= 18 ? 1 : 0;
  const score = Math.max(weightScore, drawdownScore);
  return score === 2 ? 'High' : score === 1 ? 'Medium' : 'Low';
}

function sectorConcentration(positions) {
  const totals = new Map();
  positions.forEach(({ sector, weight }) => {
    const key = sector || 'Друго';
    totals.set(key, (totals.get(key) || 0) + weight);
  });
  return Array.from(totals.entries())
    .map(([sector, weight]) => ({ sector, weightPercent: Number(weight.toFixed(1)) }))
    .sort((a, b) => b.weightPercent - a.weightPercent);
}

function weightedAiScore(positions) {
  const totalWeight = positions.reduce((s, p) => s + p.weight, 0);
  if (totalWeight === 0) return null;
  const weighted = positions.reduce((s, p) => s + p.weight * (p.aiScore ?? 50), 0);
  return Math.round(weighted / totalWeight);
}

// 0-100 composite risk score from top-sector concentration + average
// drawdown — the same two inputs portfolioRiskLevel buckets into
// Low/Medium/High, exposed as a raw number so callers that need a
// magnitude (e.g. "risk changed by +12") aren't stuck with 3 buckets.
function portfolioRiskScore(positions) {
  if (positions.length === 0) return 0;
  const concentration = sectorConcentration(positions);
  const topSectorWeight = concentration[0]?.weightPercent ?? 0;
  const avgDrawdown = positions.reduce((s, p) => s + (p.drawdownPercent ?? 20), 0) / positions.length;
  const rawScore =
    (topSectorWeight >= 50 ? 2 : topSectorWeight >= 30 ? 1 : 0) +
    (avgDrawdown >= 30 ? 2 : avgDrawdown >= 15 ? 1 : 0);
  return Math.round((rawScore / 4) * 100);
}

function portfolioRiskLevel(positions) {
  if (positions.length === 0) return 'Low';
  const score = portfolioRiskScore(positions);
  return score >= 75 ? 'High' : score >= 25 ? 'Medium' : 'Low';
}

module.exports = {
  sparklineFrom,
  maxDrawdownPercent,
  dailyReturns,
  correlationBetween,
  riskLevelFor,
  sectorConcentration,
  weightedAiScore,
  portfolioRiskScore,
  portfolioRiskLevel,
};
