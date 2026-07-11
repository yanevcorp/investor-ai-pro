import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { toRenderable } from './ui';

const riskLabels = { Low: 'Нисък', Medium: 'Среден', High: 'Висок' };
const riskColors = { Low: 'text-green-400', Medium: 'text-yellow-400', High: 'text-red-400' };

const recommendationStyles = {
  'Добра добавка': 'bg-green-500/10 text-green-400 border-green-500/30',
  Внимавай: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  'Не препоръчваме': 'bg-red-500/10 text-red-400 border-red-500/30',
};

const SIMULATE_DEBOUNCE_MS = 400;
const DEFAULT_SHARES = 10;

export default function SimulatorModal({ symbol, price, onClose }) {
  const [shares, setShares] = useState(DEFAULT_SHARES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [result, setResult] = useState(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const validShares = Number(shares) > 0 ? Number(shares) : null;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(false);

    const timer = setTimeout(() => {
      api
        .post('/portfolio/simulate', { symbol, shares: validShares })
        .then((res) => {
          if (requestIdRef.current !== requestId) return;
          setResult(res.data);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setError(true);
        })
        .finally(() => {
          if (requestIdRef.current === requestId) setLoading(false);
        });
    }, SIMULATE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [symbol, shares]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const beforeScore = result?.currentScore;
  const afterScore = result?.newScore;
  const beforeRisk = riskLabels[result?.before?.riskLevel] || 'N/A';
  const afterRisk = riskLabels[result?.after?.riskLevel] || 'N/A';
  const riskChange = result?.riskChange;
  const estimatedValue = price != null && Number(shares) > 0 ? Number(shares) * price : null;
  const sector = result?.sectorConcentration;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-slate-800 border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-white leading-snug">Как би се променило портфолиото ти?</h2>
          <button
            onClick={onClose}
            className="shrink-0 text-slate-500 hover:text-white text-xl leading-none"
            aria-label="Затвори"
          >
            ✕
          </button>
        </div>

        <div className="flex items-end gap-3 mb-5">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Брой акции от {toRenderable(symbol)}</label>
            <input
              type="number"
              min="1"
              step="1"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {estimatedValue != null && (
            <div className="text-xs text-slate-500 pb-2.5 whitespace-nowrap">≈ ${estimatedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          )}
        </div>

        {loading && <p className="text-sm text-slate-500">Изчисляване...</p>}
        {error && <p className="text-sm text-red-400">Неуспешна симулация. Опитай отново.</p>}

        {!loading && !error && result && (
          <div className="space-y-5">
            {result.recommendation && (
              <div
                className={`text-center rounded-lg border px-4 py-2.5 text-sm font-bold ${
                  recommendationStyles[result.recommendation] || 'bg-slate-900/50 text-slate-300 border-slate-700'
                }`}
              >
                {result.recommendation}
              </div>
            )}

            <p className="text-xs text-slate-500 bg-slate-900/50 rounded-lg p-3">
              {result.hasExistingHoldings
                ? `Симулация при тегло ${result.assumedWeightPercent}% от портфолиото (съществуващите позиции се преразпределят пропорционално).`
                : `Нямаш позиции в портфолиото все още — резултатите показват самостоятелния профил на ${toRenderable(symbol)}.`}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">Текущ резултат на портфолиото</div>
                <div className="text-2xl font-bold text-white">{beforeScore ?? 'N/A'}<span className="text-sm text-slate-500">/100</span></div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">Нов резултат след добавяне</div>
                <div
                  className={`text-2xl font-bold ${
                    afterScore != null && beforeScore != null && afterScore >= beforeScore
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {afterScore ?? 'N/A'}<span className="text-sm text-slate-500">/100</span>
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">Риск (сега → след)</div>
                <div className="text-sm font-semibold">
                  <span className={riskColors[result?.before?.riskLevel] || 'text-slate-300'}>{beforeRisk}</span>
                  <span className="text-slate-600"> → </span>
                  <span className={riskColors[result?.after?.riskLevel] || 'text-slate-300'}>{afterRisk}</span>
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">Промяна в риска</div>
                <div className={`text-2xl font-bold ${riskChange > 0 ? 'text-red-400' : riskChange < 0 ? 'text-green-400' : 'text-slate-300'}`}>
                  {riskChange != null ? `${riskChange > 0 ? '+' : ''}${riskChange}%` : 'N/A'}
                </div>
              </div>
            </div>

            {sector && (
              <div>
                <div className="text-sm font-medium text-slate-400 mb-2">Концентрация в сектор {toRenderable(sector.sector)}</div>
                <div className="flex items-center justify-between text-sm bg-slate-900/50 rounded-lg p-3">
                  <span className="text-slate-300">{sector.before}% → {sector.after}%</span>
                  <span className={`font-semibold ${sector.change > 0 ? 'text-yellow-400' : 'text-slate-400'}`}>
                    {sector.change > 0 ? '+' : ''}{sector.change}%
                  </span>
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium text-slate-400 mb-2">Корелация със съществуващи позиции</div>
              {!result.correlations || result.correlations.length === 0 ? (
                <p className="text-sm text-slate-500">Няма данни за корелация.</p>
              ) : (
                <div className="space-y-2">
                  {result.correlations.map((c) => (
                    <div key={c.symbol} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{toRenderable(c.symbol)}</span>
                      <span className="text-slate-400">{c.correlation != null ? c.correlation.toFixed(2) : 'N/A'}</span>
                    </div>
                  ))}
                  {result.avgCorrelation != null && (
                    <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-slate-700">
                      <span className="text-white">Средна корелация</span>
                      <span className="text-white">{result.avgCorrelation.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
