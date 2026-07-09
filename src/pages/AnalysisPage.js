import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import api from '../lib/api';
import { Card, VerdictBadge, MetricRow } from '../components/ui';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'financials', label: 'Financials' },
  { key: 'technicals', label: 'Technicals' },
  { key: 'sentiment', label: 'Sentiment' },
  { key: 'macro', label: 'Macro' },
  { key: 'insider', label: 'Insider' },
  { key: 'predictions', label: 'Predictions' },
];

export default function AnalysisPage() {
  const { symbol } = useParams();
  const sym = (symbol || '').toUpperCase();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setStock(null);

    api
      .get(`/stocks/${sym}`)
      .then((res) => {
        if (!cancelled) setStock(res.data.stock);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sym]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-24 px-4 flex flex-col items-center text-center text-slate-500">
        Зареждане на анализ за {sym}...
      </div>
    );
  }

  if (notFound || !stock) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-24 px-4 flex flex-col items-center text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-white mb-2">Няма данни за "{symbol}"</h2>
        <p className="text-slate-400 mb-6">Опитай с един от предложените тикери.</p>
        <Link to="/" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
          Обратно към търсене
        </Link>
      </div>
    );
  }

  const details = stock.analysis || {};
  const isPositive = stock.change >= 0;
  const probabilityData = ['1W', '1M', '3M'].map((period) => ({
    period,
    UP: details.probability?.[period]?.up ?? 0,
    FLAT: details.probability?.[period]?.flat ?? 0,
    DOWN: details.probability?.[period]?.down ?? 0,
  }));

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{stock.symbol}</h1>
              <span className="text-slate-400 text-sm">{stock.name}</span>
            </div>
            <p className="text-xs text-slate-500">{stock.sector}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-white">${stock.price.toFixed(2)}</div>
              <div className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)} ({Math.abs(stock.changePercent).toFixed(2)}%)
              </div>
            </div>
            <VerdictBadge verdict={stock.verdict} className="text-sm px-4 py-2" />
          </div>
        </div>

        {/* XAI Explanation */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            Защо препоръчваме <span className="text-blue-400">{stock.verdict}</span>?
          </h2>
          <p className="text-sm text-slate-500 mb-4">AI Score: {stock.aiScore}/100 — базирано на претеглена комбинация от фактори</p>
          <div className="space-y-2">
            {(details.xaiReasons || []).map((reason, i) => (
              <div key={i} className="flex items-center justify-between gap-4 bg-slate-900/50 rounded-lg px-4 py-2.5">
                <span className="text-sm text-slate-300 flex items-center gap-2">
                  <span>{reason.positive ? '✅' : '❌'}</span>
                  {reason.label}
                </span>
                <span className={`text-sm font-semibold ${reason.positive ? 'text-green-400' : 'text-red-400'}`}>
                  {reason.points > 0 ? '+' : ''}{reason.points} т.
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Probability chart */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Вероятност за посока на цената</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={probabilityData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="period" stroke="#64748b" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
                  cursor={{ fill: 'rgba(148,163,184,0.05)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="UP" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="FLAT" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="DOWN" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-4 bg-slate-800/60 border border-slate-700 rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Card>
          {(details[tab] || []).map((metric, i) => (
            <MetricRow key={i} label={metric.label} value={metric.value} good={metric.good} />
          ))}
        </Card>
      </div>
    </div>
  );
}
