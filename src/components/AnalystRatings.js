import { Card } from './ui';

const CATEGORIES = [
  { key: 'strongSell', label: 'Strong Sell', color: 'bg-red-600' },
  { key: 'sell', label: 'Sell', color: 'bg-red-400' },
  { key: 'hold', label: 'Hold', color: 'bg-slate-500' },
  { key: 'buy', label: 'Buy', color: 'bg-green-400' },
  { key: 'strongBuy', label: 'Strong Buy', color: 'bg-green-600' },
];

// analystRatings: { period, strongBuy, buy, hold, sell, strongSell, totalAnalysts }
// from Finnhub's free /stock/recommendation endpoint. No price targets —
// Finnhub's /stock/price-target returns 403 on the free tier.
export default function AnalystRatings({ analystRatings }) {
  if (!analystRatings || !analystRatings.totalAnalysts) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-white mb-1">Препоръки на анализатори</h2>
        <p className="text-sm text-slate-500">Няма данни за анализаторски препоръки.</p>
      </Card>
    );
  }

  const { totalAnalysts, period } = analystRatings;

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-white">Препоръки на анализатори</h2>
        <span className="text-xs text-slate-500">{totalAnalysts} анализатора</span>
      </div>
      {period && <p className="text-xs text-slate-600 mb-4">Период: {period}</p>}

      <div className="h-3 rounded-full overflow-hidden flex bg-slate-900 mb-4">
        {CATEGORIES.map(({ key, color }) => {
          const count = analystRatings[key] || 0;
          const widthPercent = (count / totalAnalysts) * 100;
          if (widthPercent === 0) return null;
          return <div key={key} className={color} style={{ width: `${widthPercent}%` }} title={`${key}: ${count}`} />;
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {CATEGORIES.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
            <div>
              <div className="text-xs text-slate-500">{label}</div>
              <div className="text-sm font-semibold text-white">{analystRatings[key] || 0}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
