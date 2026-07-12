import { Card } from './ui';

const CATEGORIES = [
  { key: 'strongSell', label: 'Strong Sell', color: 'bg-red-600' },
  { key: 'sell', label: 'Sell', color: 'bg-red-400' },
  { key: 'hold', label: 'Hold', color: 'bg-slate-500' },
  { key: 'buy', label: 'Buy', color: 'bg-green-400' },
  { key: 'strongBuy', label: 'Strong Buy', color: 'bg-green-600' },
];

// priceTarget: { high, low, consensus, median } from FMP's free
// price-target-consensus endpoint. Renders a Simply Wall St-style bar: the
// low-high range as a track, the consensus target and current price as
// markers positioned along it.
function PriceTargetBar({ priceTarget, currentPrice }) {
  const { low, high, consensus } = priceTarget || {};
  if (typeof low !== 'number' || typeof high !== 'number' || high <= low) return null;

  const percentOf = (value) => Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100));
  const currentPercent = Number.isFinite(currentPrice) ? percentOf(currentPrice) : null;
  const consensusPercent = typeof consensus === 'number' ? percentOf(consensus) : null;
  const upsidePercent =
    Number.isFinite(currentPrice) && currentPrice > 0 && typeof consensus === 'number'
      ? ((consensus - currentPrice) / currentPrice) * 100
      : null;

  return (
    <div className="mb-5 pb-5 border-b border-slate-700/60">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span>Целеви цени на анализаторите</span>
        {upsidePercent !== null && (
          <span className={upsidePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
            {upsidePercent >= 0 ? '+' : ''}
            {upsidePercent.toFixed(1)}% до консенсус
          </span>
        )}
      </div>

      <div className="relative h-2 rounded-full bg-gradient-to-r from-red-500/40 via-slate-500/40 to-green-500/40 mb-2">
        {consensusPercent !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-4 bg-amber-400"
            style={{ left: `${consensusPercent}%` }}
            title="Консенсус"
          />
        )}
        {currentPercent !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-blue-500"
            style={{ left: `${currentPercent}%` }}
            title="Текуща цена"
          />
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <div>
          <div className="text-slate-500">Ниска</div>
          <div className="text-white font-medium">${low.toFixed(2)}</div>
        </div>
        {typeof consensus === 'number' && (
          <div className="text-center">
            <div className="text-slate-500">Консенсус</div>
            <div className="text-amber-400 font-medium">${consensus.toFixed(2)}</div>
          </div>
        )}
        <div className="text-right">
          <div className="text-slate-500">Висока</div>
          <div className="text-white font-medium">${high.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

// analystRatings: { strongBuy, buy, hold, sell, strongSell, totalAnalysts,
// consensus, priceTarget } — from FMP's free grades-consensus +
// price-target-consensus endpoints (see backend/src/services/fmpService.js).
export default function AnalystRatings({ analystRatings, currentPrice }) {
  if (!analystRatings || !analystRatings.totalAnalysts) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-white mb-1">Препоръки на анализатори</h2>
        <p className="text-sm text-slate-500">Няма данни за анализаторски препоръки.</p>
      </Card>
    );
  }

  const { totalAnalysts, consensus, priceTarget } = analystRatings;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Препоръки на анализатори</h2>
        <span className="text-xs text-slate-500">
          {totalAnalysts} анализатора{consensus ? ` · ${consensus}` : ''}
        </span>
      </div>

      {priceTarget && <PriceTargetBar priceTarget={priceTarget} currentPrice={currentPrice} />}

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
