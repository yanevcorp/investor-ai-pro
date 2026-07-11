import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, Cell, ReferenceLine, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import api from '../lib/api';
import ErrorBoundary from './ErrorBoundary';
import { timeAgo } from '../utils/time';

// Deterministic pseudo-random generator (mulberry32-style) so the
// illustrative visuals (volume bars, insider role breakdown, sentiment
// trend) are stable across re-renders/refreshes for a given alert instead
// of reshuffling randomly every time the card is opened.
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

// The Alert schema only has 4 `type` values (anomaly/volume/ownership/
// sentiment), which don't line up 1:1 with the 4 visualizations this
// feature asks for (price/volume/insider/sentiment) — an "anomaly" alert
// might be about insider selling or about short interest. Keyword-match
// the (already-generic, no-real-names) title/description to pick the
// right detail view.
function categoryFor(alert) {
  if (alert.type === 'volume') return 'volume';
  if (alert.type === 'sentiment') return 'sentiment';
  const text = `${alert.title} ${alert.description}`.toLowerCase();
  if (
    text.includes('insider') ||
    text.includes('инсайдер') ||
    text.includes('изпълнителен директор') ||
    text.includes('финансов директор')
  ) {
    return 'insider';
  }
  return 'price';
}

function IllustrativeBadge() {
  return (
    <span
      className="text-[10px] font-semibold text-slate-500 border border-slate-700 rounded px-1.5 py-0.5"
      title="Няма свързан API за тези данни — визуализацията е илюстративна, не реални пазарни данни."
    >
      Илюстрация
    </span>
  );
}

const chartTooltipStyle = { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 };

function StatCard({ label, value, tone = 'text-slate-200' }) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-3">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

// Real data: last few daily closes from the same Alpha Vantage-backed
// history endpoint that powers sparklines elsewhere in the app. "48
// hours" from the spec is approximated as the most recent trading days,
// since only daily-resolution history is available — labeled honestly
// rather than claiming hourly granularity we don't have.
function PriceAnomalyView({ symbol }) {
  const [state, setState] = useState({ loading: true, error: false, history: [] });

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/stocks/${symbol}/history`)
      .then((res) => {
        if (cancelled) return;
        const history = Array.isArray(res.data?.history) ? res.data.history.slice(-6) : [];
        setState({ loading: false, error: false, history });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, error: true, history: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (state.loading) return <p className="text-sm text-slate-500">Зареждане на графика...</p>;
  if (state.error || state.history.length < 2) {
    return <p className="text-sm text-slate-500">Няма достатъчно данни за графика.</p>;
  }

  const closes = state.history.map((p) => p.close);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const changePercent = ((last - first) / first) * 100;
  const high = Math.max(...closes);
  const low = Math.min(...closes);
  const rangePercent = ((high - low) / high) * 100;
  const color = last >= first ? '#22c55e' : '#ef4444';
  const data = state.history.map((p) => ({ date: p.date.slice(5), close: p.close }));

  return (
    <div>
      <div className="text-xs text-slate-500 mb-2">Ценово движение (последни търговски дни)</div>
      <ErrorBoundary fallback={<div style={{ height: 120 }} />}>
        <div style={{ width: '100%', height: 120 }}>
          <ResponsiveContainer width="100%" height={120} minWidth={200} minHeight={120}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="close" stroke={color} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ErrorBoundary>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <StatCard
          label="Промяна за периода"
          value={`${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`}
          tone={changePercent >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <StatCard label="Диапазон (макс-мин)" value={`${rangePercent.toFixed(2)}%`} />
      </div>
    </div>
  );
}

// Illustrative: no real intraday volume source exists in this app
// (Finnhub's free-tier /quote doesn't return volume, and there's no
// candle/stats access on this key). Shape mirrors the alert's own
// wording (a real spike day) but the magnitude is synthetic.
function VolumeAnomalyView({ alert }) {
  const rand = useMemo(() => seededRandom(`${alert.symbol}:${alert._id}`), [alert.symbol, alert._id]);
  const data = useMemo(() => {
    const base = 1 + rand() * 0.4;
    return Array.from({ length: 7 }, (_, i) => {
      const isSpikeDay = i === 6;
      const ratio = isSpikeDay ? 2.5 + rand() * 3 : base + (rand() - 0.5) * 0.6;
      return { day: `Д-${6 - i}`, ratio: Number(Math.max(0.2, ratio).toFixed(2)) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert.symbol, alert._id]);
  const avg = Number((data.reduce((s, d) => s + d.ratio, 0) / data.length).toFixed(2));
  const todayRatio = data[data.length - 1].ratio;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-slate-500">Обем спрямо средното (последни 7 дни)</div>
        <IllustrativeBadge />
      </div>
      <ErrorBoundary fallback={<div style={{ height: 120 }} />}>
        <div style={{ width: '100%', height: 120 }}>
          <ResponsiveContainer width="100%" height={120} minWidth={200} minHeight={120}>
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis hide domain={[0, 'dataMax']} />
              <ReferenceLine y={avg} stroke="#64748b" strokeDasharray="4 4" />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="ratio" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.ratio >= avg * 1.8 ? '#ef4444' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ErrorBoundary>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <StatCard label="Днес спрямо средното" value={`${todayRatio}x`} tone="text-white" />
        <StatCard label="7-дневна средна" value={`${avg}x база`} />
      </div>
    </div>
  );
}

// Illustrative and deliberately role-based, not tied to any real named
// individual — the alert text itself never names a specific executive,
// only a title (e.g. "изпълнителен директор"), and this view keeps that
// convention rather than inventing people.
const INSIDER_ROLES = ['Изпълнителен директор', 'Финансов директор', 'Директор Продажби'];

function InsiderView({ alert }) {
  const rand = useMemo(() => seededRandom(`${alert.symbol}:${alert._id}:insider`), [alert.symbol, alert._id]);
  const isSelling = /продажб/i.test(`${alert.title} ${alert.description}`);
  const rows = useMemo(
    () =>
      INSIDER_ROLES.map((role, i) => {
        const magnitude = i === 0 ? 60 + rand() * 30 : 10 + rand() * 40;
        const primaryAction = isSelling ? 'Продава' : 'Купува';
        const oppositeAction = isSelling ? 'Купува' : 'Продава';
        const action = i === 0 ? primaryAction : rand() > 0.5 ? primaryAction : oppositeAction;
        return { role, action, magnitude: Math.round(magnitude) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alert.symbol, alert._id, isSelling]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-slate-500">Разбивка по роля</div>
        <IllustrativeBadge />
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.role} className="flex items-center gap-3">
            <span className="w-36 sm:w-40 shrink-0 text-sm text-slate-300 truncate">{r.role}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${r.action === 'Продава' ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${r.magnitude}%` }}
              />
            </div>
            <span className={`w-16 text-right text-xs font-semibold ${r.action === 'Продава' ? 'text-red-400' : 'text-green-400'}`}>
              {r.action}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Trend line is illustrative (no numeric sentiment-scoring pipeline
// exists), but the headlines underneath are real — reuses the same
// NewsAPI-backed article list already fetched for AnalysisPage's
// Sentiment tab.
function SentimentView({ symbol }) {
  const [state, setState] = useState({ loading: true, error: false, news: [] });
  const rand = useMemo(() => seededRandom(`${symbol}:sentiment`), [symbol]);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/stocks/${symbol}`)
      .then((res) => {
        if (cancelled) return;
        const news = Array.isArray(res.data?.stock?.analysis?.news) ? res.data.stock.analysis.news.slice(0, 3) : [];
        setState({ loading: false, error: false, news });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, error: true, news: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const trendData = useMemo(() => {
    let score = 20 + rand() * 20;
    return Array.from({ length: 10 }, (_, i) => {
      // Gentle downward-biased drift, matching this app's "sentiment
      // drift" style alerts rather than a random walk.
      score += (rand() - 0.65) * 8;
      score = Math.max(-100, Math.min(100, score));
      return { i, score: Number(score.toFixed(1)) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);
  const trendColor = trendData[trendData.length - 1].score >= trendData[0].score ? '#22c55e' : '#ef4444';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-slate-500">Тренд на новинарски сентимент</div>
        <IllustrativeBadge />
      </div>
      <ErrorBoundary fallback={<div style={{ height: 90 }} />}>
        <div style={{ width: '100%', height: 90 }}>
          <ResponsiveContainer width="100%" height={90} minWidth={200} minHeight={90}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <YAxis hide domain={[-100, 100]} />
              <ReferenceLine y={0} stroke="#334155" />
              <Line type="monotone" dataKey="score" stroke={trendColor} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ErrorBoundary>

      <div className="mt-3">
        <div className="text-xs text-slate-500 mb-2">Скорошни новини</div>
        {state.loading ? (
          <p className="text-sm text-slate-500">Зареждане...</p>
        ) : state.news.length === 0 ? (
          <p className="text-sm text-slate-500">Няма скорошни новини.</p>
        ) : (
          <div className="space-y-2">
            {state.news.map((n, i) => (
              <a
                key={i}
                href={n.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block bg-slate-900/50 hover:bg-slate-900 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs text-blue-400 font-medium">{n.source}</span>
                  {n.publishedAt && <span className="text-xs text-slate-500">{timeAgo(n.publishedAt)}</span>}
                </div>
                <div className="text-sm text-slate-200">{n.title}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AlertDetail({ alert }) {
  const navigate = useNavigate();
  const category = categoryFor(alert);

  return (
    <div className="pt-4 mt-3 border-t border-slate-700/60">
      <p className="text-sm text-slate-400 mb-4">{alert.description}</p>

      {category === 'price' && <PriceAnomalyView symbol={alert.symbol} />}
      {category === 'volume' && <VolumeAnomalyView alert={alert} />}
      {category === 'insider' && <InsiderView alert={alert} />}
      {category === 'sentiment' && <SentimentView symbol={alert.symbol} />}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/analysis/${alert.symbol}`);
        }}
        className="w-full mt-4 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
      >
        Виж акцията
      </button>
    </div>
  );
}
