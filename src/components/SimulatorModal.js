import { useEffect, useState } from 'react';
import api from '../lib/api';
import { toRenderable } from './ui';

const riskLabels = { Low: 'Нисък', Medium: 'Среден', High: 'Висок' };
const riskColors = { Low: 'text-green-400', Medium: 'text-yellow-400', High: 'text-red-400' };

export default function SimulatorModal({ symbol, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    api
      .post('/portfolio/simulate', { symbol })
      .then((res) => {
        if (cancelled) return;
        setResult(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const beforeScore = result?.before?.aiScore;
  const afterScore = result?.after?.aiScore;
  const beforeRisk = riskLabels[result?.before?.riskLevel] || 'N/A';
  const afterRisk = riskLabels[result?.after?.riskLevel] || 'N/A';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Симулация: добавяне на {toRenderable(symbol)}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none" aria-label="Затвори">
            ✕
          </button>
        </div>

        {loading && <p className="text-sm text-slate-500">Изчисляване...</p>}
        {error && <p className="text-sm text-red-400">Неуспешна симулация. Опитай отново.</p>}

        {!loading && !error && result && (
          <div className="space-y-5">
            <p className="text-xs text-slate-500 bg-slate-900/50 rounded-lg p-3">
              {result.hasExistingHoldings
                ? `Симулация при добавяне с тегло ${result.assumedWeightPercent}% (съществуващите позиции се преразпределят пропорционално).`
                : `Нямаш позиции в портфолиото все още — резултатите показват самостоятелния профил на ${toRenderable(symbol)}.`}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">AI Score (сега)</div>
                <div className="text-2xl font-bold text-white">{beforeScore ?? 'N/A'}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">AI Score (след)</div>
                <div
                  className={`text-2xl font-bold ${
                    afterScore != null && beforeScore != null && afterScore >= beforeScore
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {afterScore ?? 'N/A'}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">Риск (сега)</div>
                <div className={`text-lg font-semibold ${riskColors[result?.before?.riskLevel] || 'text-slate-300'}`}>
                  {beforeRisk}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">Риск (след)</div>
                <div className={`text-lg font-semibold ${riskColors[result?.after?.riskLevel] || 'text-slate-300'}`}>
                  {afterRisk}
                </div>
              </div>
            </div>

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
