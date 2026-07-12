import { useState } from 'react';
import { Card } from './ui';

const CATEGORIES = [
  { key: 'management', label: 'Управление' },
  { key: 'financialHealth', label: 'Финансово здраве' },
  { key: 'growth', label: 'Ръст' },
  { key: 'profitability', label: 'Рентабилност' },
  { key: 'dividends', label: 'Дивиденти' },
  { key: 'analyst', label: 'Анализатори' },
];

function scoreColor(score) {
  if (score === null || score === undefined) return 'text-slate-500 border-slate-700';
  if (score >= 70) return 'text-green-400 border-green-500/30';
  if (score >= 40) return 'text-yellow-400 border-yellow-500/30';
  return 'text-red-400 border-red-500/30';
}

// valuationScores: { [category]: { score: 0-100|null, detail: [{label, value, positive}] } }
// Heuristic scores derived from data already fetched for this stock — see
// backend/src/utils/buildValuationScores.js for the exact formulas. A null
// score means the underlying data isn't available (e.g. ETFs have no
// income statement, so growth/profitability/financialHealth show N/A).
export default function ValuationScores({ valuationScores }) {
  const [expandedKey, setExpandedKey] = useState(null);

  if (!valuationScores) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {CATEGORIES.map(({ key, label }) => {
        const entry = valuationScores[key] || { score: null, detail: [] };
        const isExpanded = expandedKey === key;

        return (
          <Card key={key} className="!p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedKey(isExpanded ? null : key)}
              className="w-full text-left px-4 py-3.5 hover:bg-slate-700/20 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-400">{label}</span>
                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full border text-sm font-bold ${scoreColor(entry.score)}`}>
                  {entry.score ?? 'N/A'}
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-3.5 border-t border-slate-700/60 pt-3">
                {entry.detail.length === 0 ? (
                  <p className="text-xs text-slate-500">Няма достатъчно данни.</p>
                ) : (
                  <div className="space-y-1.5">
                    {entry.detail.map((d, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-500">{d.label}</span>
                        <span className={d.positive ? 'text-green-400' : 'text-red-400'}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
