import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../lib/api';
import ErrorBoundary from './ErrorBoundary';

const RANGES = ['1M', 'YTD', '1Y', '3Y', '5Y', '20Y'];

function formatDateForRange(dateStr, range) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  if (range === '1M' || range === 'YTD') {
    return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('bg-BG', { month: 'short', year: '2-digit' });
}

export default function PriceChart({ symbol, currentPrice }) {
  const [range, setRange] = useState('1Y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    api
      .get(`/stocks/${symbol}/history`, { params: { range } })
      .then((res) => {
        if (cancelled) return;
        setHistory(Array.isArray(res.data?.history) ? res.data.history : []);
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
  }, [symbol, range]);

  const closes = history.map((p) => p.close).filter((c) => Number.isFinite(c));
  const positive = closes.length >= 2 ? closes[closes.length - 1] >= closes[0] : true;
  const color = positive ? '#22c55e' : '#ef4444';

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-4">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              range === r ? 'bg-blue-600 text-white' : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <ErrorBoundary
        fallback={<div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Графиката не можа да се зареди.</div>}
      >
        {loading ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Зареждане...</div>
        ) : error || closes.length < 2 ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Няма достатъчно данни за този период.</div>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height={280} minWidth={280} minHeight={280}>
              <AreaChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="priceChartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(d) => formatDateForRange(d, range)}
                  minTickGap={40}
                />
                <YAxis
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                  width={56}
                />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
                  labelFormatter={(d) => formatDateForRange(d, range)}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Цена']}
                />
                {Number.isFinite(currentPrice) && (
                  <ReferenceLine y={currentPrice} stroke="#64748b" strokeDasharray="4 4" ifOverflow="extendDomain" />
                )}
                <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill="url(#priceChartFill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
}
