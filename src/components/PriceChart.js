import { useEffect, useState } from 'react';
import { ComposedChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../lib/api';
import ErrorBoundary from './ErrorBoundary';
import { Skeleton } from './Skeleton';

const RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'];
const UP_COLOR = '#22c55e';
const DOWN_COLOR = '#ef4444';
const AXIS_WIDTH = 56;

function formatDateForRange(dateStr, range) {
  // 1D points are "YYYY-MM-DD HH:MM:SS" (space-separated, not ISO) —
  // normalize to a "T" separator first since space-separated datetimes
  // parse inconsistently across JS engines.
  const d = new Date(range === '1D' ? dateStr.replace(' ', 'T') : dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  if (range === '1D') {
    return d.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
  }
  if (range === '1W' || range === '1M' || range === '3M') {
    return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('bg-BG', { month: 'short', year: '2-digit' });
}

function formatVolume(v) {
  if (!Number.isFinite(v)) return 'N/A';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}

// Recharts has no built-in candlestick chart — this composes one from a
// single Bar whose dataKey resolves to a [low, high] range (recharts
// derives that bar's pixel y/height from the range across the whole
// dataset), with a custom shape that draws the high-low wick plus the
// open-close body within that same pixel span.
function CandleShape(props) {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;
  if (![open, close, high, low].every(Number.isFinite) || high === low) return null;

  const isUp = close >= open;
  const color = isUp ? UP_COLOR : DOWN_COLOR;
  const priceToY = (price) => y + height - ((price - low) / (high - low)) * height;
  const bodyTop = priceToY(Math.max(open, close));
  const bodyBottom = priceToY(Math.min(open, close));
  const bodyHeight = Math.max(1, bodyBottom - bodyTop);
  const wickX = x + width / 2;
  const bodyWidth = Math.max(2, width * 0.6);
  const bodyX = x + (width - bodyWidth) / 2;

  return (
    <g>
      <line x1={wickX} x2={wickX} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={bodyX} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color} />
    </g>
  );
}

function VolumeShape(props) {
  const { x, y, width, height, payload } = props;
  const isUp = payload.close >= payload.open;
  return <rect x={x} y={y} width={width} height={height} fill={isUp ? UP_COLOR : DOWN_COLOR} fillOpacity={0.45} />;
}

function CandleTooltip({ active, payload, range }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 space-y-0.5 shadow-xl">
      <div className="text-slate-400 mb-1">{formatDateForRange(d.date, range)}</div>
      <div>
        O: <span className="text-white font-medium">${Number(d.open).toFixed(2)}</span>
      </div>
      <div>
        H: <span className="text-white font-medium">${Number(d.high).toFixed(2)}</span>
      </div>
      <div>
        L: <span className="text-white font-medium">${Number(d.low).toFixed(2)}</span>
      </div>
      <div>
        C: <span className="text-white font-medium">${Number(d.close).toFixed(2)}</span>
      </div>
      <div>
        Обем: <span className="text-white font-medium">{formatVolume(d.volume)}</span>
      </div>
    </div>
  );
}

export default function PriceChart({ symbol, currentPrice }) {
  const [range, setRange] = useState('1Y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [candles, setCandles] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    api
      .get(`/stocks/${symbol}/ohlc`, { params: { range } })
      .then((res) => {
        if (cancelled) return;
        setCandles(Array.isArray(res.data?.candles) ? res.data.candles : []);
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

  const chartData = candles
    .filter((c) => [c.open, c.high, c.low, c.close].every(Number.isFinite))
    .map((c) => ({ ...c, range: [c.low, c.high] }));

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
          <div className="space-y-2">
            <Skeleton className="h-[220px] w-full" />
            <Skeleton className="h-[60px] w-full" />
          </div>
        ) : error || chartData.length < 2 ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Няма достатъчно данни за този период.</div>
        ) : (
          <div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height={220} minWidth={280} minHeight={220}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis
                    stroke="#64748b"
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                    width={AXIS_WIDTH}
                  />
                  <Tooltip content={<CandleTooltip range={range} />} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
                  {Number.isFinite(currentPrice) && (
                    <ReferenceLine y={currentPrice} stroke="#64748b" strokeDasharray="4 4" ifOverflow="extendDomain" />
                  )}
                  <Bar dataKey="range" shape={CandleShape} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: '100%', height: 70 }}>
              <ResponsiveContainer width="100%" height={70} minWidth={280} minHeight={70}>
                <BarChart data={chartData} margin={{ top: 0, right: 8, bottom: 4, left: 0 }}>
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(d) => formatDateForRange(d, range)}
                    minTickGap={40}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis domain={[0, 'auto']} hide width={AXIS_WIDTH} />
                  <Tooltip content={<CandleTooltip range={range} />} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
                  <Bar dataKey="volume" shape={VolumeShape} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
}
