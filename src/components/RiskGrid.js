import { Card } from './ui';

function riskLevelFor({ weightPercent, drawdownPercent }) {
  const weightScore = weightPercent >= 30 ? 2 : weightPercent >= 15 ? 1 : 0;
  const drawdownScore = drawdownPercent == null ? 1 : drawdownPercent >= 35 ? 2 : drawdownPercent >= 18 ? 1 : 0;
  const score = Math.max(weightScore, drawdownScore);
  return score === 2 ? 'High' : score === 1 ? 'Medium' : 'Low';
}

const riskBadgeStyles = {
  Low: 'bg-green-500/10 text-green-400 border-green-500/25',
  Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',
  High: 'bg-red-500/10 text-red-400 border-red-500/25',
};

const riskBarStyles = {
  Low: 'bg-green-500',
  Medium: 'bg-yellow-500',
  High: 'bg-red-500',
};

const riskLabels = { Low: 'Нисък', Medium: 'Среден', High: 'Висок' };
const riskDots = { Low: '🟢', Medium: '🟡', High: '🔴' };

function sectorConcentration(positions) {
  const totals = new Map();
  positions.forEach(({ sector, weight }) => {
    const key = sector || 'Друго';
    totals.set(key, (totals.get(key) || 0) + weight);
  });
  return Array.from(totals.entries())
    .map(([sector, weightPercent]) => ({ sector, weightPercent }))
    .sort((a, b) => b.weightPercent - a.weightPercent);
}

// Mirrors backend/src/utils/portfolioRisk.js's correlationBetween — same
// Pearson-over-overlapping-trading-days approach, kept as a client-side
// copy (like riskLevelFor/sectorConcentration above) since the risk grid
// needs it computed from histories already fetched for the sparklines,
// without a round trip to a dedicated endpoint.
function correlationBetween(historyA, historyB) {
  if (!Array.isArray(historyA) || !Array.isArray(historyB)) return null;

  const closesByDateB = new Map(historyB.map((p) => [p.date, p.close]));
  const aligned = historyA
    .filter((p) => closesByDateB.has(p.date))
    .map((p) => ({ date: p.date, a: p.close, b: closesByDateB.get(p.date) }))
    .sort((x, y) => x.date.localeCompare(y.date));

  if (aligned.length < 10) return null;

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

  return Number((cov / Math.sqrt(varA * varB)).toFixed(2));
}

// Average pairwise correlation of each position against every other
// position that also has usable history — a proxy for how redundant a
// holding is with the rest of the portfolio.
function avgCorrelationBySymbol(positions) {
  const withHistory = positions.filter((p) => Array.isArray(p.history) && p.history.length > 0);
  const result = new Map();

  positions.forEach((p) => {
    if (!Array.isArray(p.history) || p.history.length === 0) {
      result.set(p.symbol, null);
      return;
    }
    const correlations = withHistory
      .filter((other) => other.symbol !== p.symbol)
      .map((other) => correlationBetween(p.history, other.history))
      .filter((c) => c != null);
    result.set(
      p.symbol,
      correlations.length > 0
        ? Number((correlations.reduce((sum, c) => sum + c, 0) / correlations.length).toFixed(2))
        : null
    );
  });

  return result;
}

function correlationTextColor(value) {
  if (value == null) return 'text-slate-500';
  if (value >= 0.6) return 'text-red-400';
  if (value >= 0.35) return 'text-yellow-400';
  return 'text-slate-300';
}

// A heuristic 0-100 "how risky is this portfolio as a whole" score —
// same inputs as portfolioRiskLevel in backend/src/utils/portfolioRisk.js
// (top sector concentration + avg drawdown) plus this grid's own avg
// correlation and count of High-risk positions, since those are already
// computed here for the per-row columns.
function overallRiskScore({ topSectorWeight, avgDrawdown, avgCorrelation, highRiskCount }) {
  const concentrationPoints = topSectorWeight >= 50 ? 35 : topSectorWeight >= 30 ? 20 : 5;
  const drawdownPoints = avgDrawdown >= 30 ? 30 : avgDrawdown >= 15 ? 15 : 5;
  const correlationPoints = avgCorrelation == null ? 0 : avgCorrelation >= 0.6 ? 25 : avgCorrelation >= 0.35 ? 12 : 0;
  const concentrationOfHighRisk = highRiskCount >= 2 ? 10 : highRiskCount === 1 ? 5 : 0;
  const score = Math.min(100, concentrationPoints + drawdownPoints + correlationPoints + concentrationOfHighRisk);
  const level = score >= 60 ? 'High' : score >= 30 ? 'Medium' : 'Low';
  return { score, level };
}

// positions: [{ symbol, sector, weight, drawdownPercent }]
export default function RiskGrid({ positions }) {
  if (!positions || positions.length === 0) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">Рискова матрица</h2>
        <p className="text-sm text-slate-500">Все още няма позиции за анализ на риска.</p>
      </Card>
    );
  }

  const concentration = sectorConcentration(positions);
  const correlationBySymbol = avgCorrelationBySymbol(positions);

  const rows = positions.map((p) => ({
    ...p,
    risk: riskLevelFor({ weightPercent: p.weight, drawdownPercent: p.drawdownPercent }),
    avgCorrelation: correlationBySymbol.get(p.symbol),
  }));

  const topSectorWeight = concentration[0]?.weightPercent ?? 0;
  const drawdownsKnown = rows.map((r) => r.drawdownPercent).filter((d) => d != null);
  const avgDrawdown = drawdownsKnown.length > 0 ? drawdownsKnown.reduce((s, d) => s + d, 0) / drawdownsKnown.length : 0;
  const correlationsKnown = rows.map((r) => r.avgCorrelation).filter((c) => c != null);
  const avgCorrelation =
    correlationsKnown.length > 0
      ? Number((correlationsKnown.reduce((s, c) => s + c, 0) / correlationsKnown.length).toFixed(2))
      : null;
  const highRiskCount = rows.filter((r) => r.risk === 'High').length;
  const summary = overallRiskScore({ topSectorWeight, avgDrawdown, avgCorrelation, highRiskCount });

  return (
    <Card>
      <h2 className="text-lg font-semibold text-white mb-4">Рискова матрица</h2>

      <h3 className="text-sm font-medium text-slate-400 mb-2">Концентрация по сектор</h3>
      <div className="space-y-2 mb-6">
        {concentration.map(({ sector, weightPercent }) => {
          const level = weightPercent >= 50 ? 'High' : weightPercent >= 30 ? 'Medium' : 'Low';
          return (
            <div key={sector} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm text-slate-300 truncate">{sector}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${riskBarStyles[level]}`}
                  style={{ width: `${Math.min(100, weightPercent)}%` }}
                />
              </div>
              <span className="w-14 text-right text-sm text-slate-400">{weightPercent.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      <h3 className="text-sm font-medium text-slate-400 mb-2">Риск по позиция</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
              <th className="pb-2 pr-3">Позиция</th>
              <th className="pb-2 pr-3">Сектор</th>
              <th className="pb-2 pr-3 text-right">Тегло</th>
              <th className="pb-2 pr-3 text-right">Просадка</th>
              <th className="pb-2 pr-3 text-right">Корелация</th>
              <th className="pb-2 text-right">Риск</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.symbol} className="border-b border-slate-800/60 last:border-0">
                <td className="py-2 pr-3 font-medium text-white">{p.symbol}</td>
                <td className="py-2 pr-3 text-slate-400">{p.sector || '—'}</td>
                <td className="py-2 pr-3 text-right text-slate-300">{p.weight.toFixed(1)}%</td>
                <td className="py-2 pr-3 text-right text-slate-300">
                  {p.drawdownPercent != null ? `-${p.drawdownPercent.toFixed(1)}%` : 'N/A'}
                </td>
                <td className={`py-2 pr-3 text-right ${correlationTextColor(p.avgCorrelation)}`}>
                  {p.avgCorrelation != null ? p.avgCorrelation.toFixed(2) : 'N/A'}
                </td>
                <td className="py-2 text-right">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold ${riskBadgeStyles[p.risk]}`}>
                    <span aria-hidden="true">{riskDots[p.risk]}</span>
                    {riskLabels[p.risk]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-700">
              <td colSpan={4} className="pt-3 pr-3 text-sm font-semibold text-white">
                Обща рискова оценка на портфолиото
              </td>
              <td colSpan={2} className="pt-3 text-right">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold ${riskBadgeStyles[summary.level]}`}>
                  <span aria-hidden="true">{riskDots[summary.level]}</span>
                  {summary.score}/100 · {riskLabels[summary.level]}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
