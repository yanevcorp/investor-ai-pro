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
              <th className="pb-2 text-right">Риск</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const risk = riskLevelFor({ weightPercent: p.weight, drawdownPercent: p.drawdownPercent });
              return (
                <tr key={p.symbol} className="border-b border-slate-800/60 last:border-0">
                  <td className="py-2 pr-3 font-medium text-white">{p.symbol}</td>
                  <td className="py-2 pr-3 text-slate-400">{p.sector || '—'}</td>
                  <td className="py-2 pr-3 text-right text-slate-300">{p.weight.toFixed(1)}%</td>
                  <td className="py-2 pr-3 text-right text-slate-300">
                    {p.drawdownPercent != null ? `-${p.drawdownPercent.toFixed(1)}%` : 'N/A'}
                  </td>
                  <td className="py-2 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-md border text-xs font-semibold ${riskBadgeStyles[risk]}`}>
                      {riskLabels[risk]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
