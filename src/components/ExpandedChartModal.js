import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import ErrorBoundary from './ErrorBoundary';
import { toRenderable } from './ui';

function ProbabilityBars({ probability }) {
  const periods = ['1W', '1M', '3M'];
  const hasAny = periods.some((period) => probability?.[period]);

  if (!hasAny) {
    return <p className="text-sm text-slate-500">Няма достатъчно данни за прогноза.</p>;
  }

  return (
    <div className="space-y-3">
      {periods.map((period) => {
        const p = probability?.[period];
        const up = Number.isFinite(p?.up) ? p.up : 0;
        const flat = Number.isFinite(p?.flat) ? p.flat : 0;
        const down = Number.isFinite(p?.down) ? p.down : 0;
        return (
          <div key={period}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{period}</span>
              <span>
                <span className="text-green-400">▲{up}%</span> <span className="text-slate-400">▬{flat}%</span>{' '}
                <span className="text-red-400">▼{down}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex bg-slate-700">
              <div className="h-full bg-green-500" style={{ width: `${up}%` }} />
              <div className="h-full bg-slate-500" style={{ width: `${flat}%` }} />
              <div className="h-full bg-red-500" style={{ width: `${down}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ExpandedChartModal({ symbol, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [history, setHistory] = useState([]);
  const [drawdownPercent, setDrawdownPercent] = useState(null);
  const [stock, setStock] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([api.get(`/stocks/${symbol}/history`), api.get(`/stocks/${symbol}`)])
      .then(([historyRes, stockRes]) => {
        if (cancelled) return;
        setHistory(Array.isArray(historyRes.data?.history) ? historyRes.data.history : []);
        setDrawdownPercent(Number.isFinite(historyRes.data?.drawdownPercent) ? historyRes.data.drawdownPercent : null);
        setStock(stockRes.data?.stock && typeof stockRes.data.stock === 'object' ? stockRes.data.stock : null);
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

  const chartData = history.map((p) => ({ date: typeof p.date === 'string' ? p.date.slice(5) : '', close: p.close }));
  const positive = history.length >= 2 ? history[history.length - 1].close >= history[0].close : true;
  const lineColor = positive ? '#22c55e' : '#ef4444';
  const tickInterval = Math.max(0, Math.floor(chartData.length / 6) - 1);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{toRenderable(symbol)}</h2>
            {toRenderable(stock?.name) && <p className="text-sm text-slate-400">{toRenderable(stock?.name)}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white text-xl leading-none"
            aria-label="Затвори"
          >
            ✕
          </button>
        </div>

        {loading && <p className="text-sm text-slate-500">Зареждане...</p>}
        {error && <p className="text-sm text-red-400">Неуспешно зареждане на графиката.</p>}

        {!loading && !error && (
          <>
            <ErrorBoundary
              fallback={
                <div className="h-[240px] flex items-center justify-center text-sm text-slate-500">
                  Графиката не можа да се зареди.
                </div>
              }
            >
              {chartData.length >= 2 ? (
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer width="100%" height={240} minWidth={240} minHeight={240}>
                    <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        interval={tickInterval}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis stroke="#64748b" tickLine={false} axisLine={false} domain={['auto', 'auto']} width={50} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
                      />
                      <Line type="monotone" dataKey="close" stroke={lineColor} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-sm text-slate-500">
                  Няма достатъчно исторически данни.
                </div>
              )}
            </ErrorBoundary>

            {drawdownPercent != null && (
              <p className="text-xs text-slate-500 mt-2">Макс. просадка (наличен период): -{drawdownPercent}%</p>
            )}

            <h3 className="text-sm font-semibold text-white mt-6 mb-3">AI прогнозна вероятност</h3>
            <ProbabilityBars probability={stock?.analysis?.probability} />
          </>
        )}
      </div>
    </div>
  );
}
