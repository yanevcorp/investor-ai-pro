import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { timeAgo } from '../utils/time';
import { Card, VerdictBadge, MetricRow, toRenderable } from '../components/ui';
import ErrorBoundary from '../components/ErrorBoundary';
import SimulatorModal from '../components/SimulatorModal';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'financials', label: 'Financials' },
  { key: 'technicals', label: 'Technicals' },
  { key: 'sentiment', label: 'Sentiment' },
  { key: 'macro', label: 'Macro' },
  { key: 'insider', label: 'Insider' },
  { key: 'predictions', label: 'Predictions' },
];

// ETFs don't have "financials" in the equity sense — the backend populates
// that same details.financials slot with top holdings for an ETF instead,
// so only the tab label needs to change, not the data plumbing.
function getTabsFor(isEtf) {
  if (!isEtf) return TABS;
  return TABS.map((t) => (t.key === 'financials' ? { ...t, label: 'Holdings' } : t));
}

const MARKET_SESSION_LABELS = {
  'pre-market': 'Преди борсата',
  'after-hours': 'След борсата',
};

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatPrice(price) {
  const n = toFiniteNumber(price);
  return n === null ? 'N/A' : `$${n.toFixed(2)}`;
}

function formatChange(change, changePercent) {
  const c = toFiniteNumber(change);
  const cp = toFiniteNumber(changePercent);
  if (c === null || cp === null) {
    return { text: 'N/A', isPositive: true };
  }
  return { text: `${Math.abs(c).toFixed(2)} (${Math.abs(cp).toFixed(2)}%)`, isPositive: c >= 0 };
}

function AddToPortfolioForm({ onAdd, onCancel }) {
  const [weight, setWeight] = useState('');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!weight || !value) return;
    setSubmitting(true);
    try {
      await onAdd({ weight: Number(weight), value: Number(value) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Тегло %</label>
        <input
          type="number"
          min="0"
          max="100"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="20"
          className="w-20 bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Стойност $</label>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="10000"
          className="w-28 bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium transition-colors"
      >
        {submitting ? 'Добавяне...' : 'Потвърди'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors"
      >
        Отказ
      </button>
    </form>
  );
}

export default function AnalysisPage() {
  const { symbol } = useParams();
  const sym = (symbol || '').toUpperCase();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('overview');
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  const loadStock = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(false);
    setStock(null);

    api
      .get(`/stocks/${sym}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.stock;
        if (data && typeof data === 'object') {
          setStock(data);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sym]);

  useEffect(() => loadStock(), [loadStock]);

  const handleAddToWatchlist = async () => {
    setAddingToWatchlist(true);
    try {
      await api.post('/watchlist', { symbol: sym });
      toast.success(`${sym} добавен в Watchlist`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Неуспешно добавяне в Watchlist.');
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const handleAddToPortfolio = async ({ weight, value }) => {
    try {
      await api.post('/portfolio', { symbol: sym, weight, value });
      toast.success(`${sym} добавен в Портфолио`);
      setShowPortfolioForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Неуспешно добавяне в Портфолио.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-24 px-4 flex flex-col items-center text-center text-slate-500">
        Зареждане на анализ за {sym}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-24 px-4 flex flex-col items-center text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-white mb-2">Неуспешно зареждане на "{symbol}"</h2>
        <p className="text-slate-400 mb-6">Възникна проблем при връзката със сървъра. Опитай отново.</p>
        <div className="flex gap-3">
          <button
            onClick={loadStock}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
          >
            Опитай отново
          </button>
          <Link to="/" className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white text-sm font-medium">
            Начало
          </Link>
        </div>
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

  const details = (stock.analysis && typeof stock.analysis === 'object') ? stock.analysis : {};
  const priceText = formatPrice(stock.price);
  const changeInfo = formatChange(stock.change, stock.changePercent);
  const aiScoreText = toFiniteNumber(stock.aiScore) === null ? 'N/A' : stock.aiScore;
  const xaiReasons = Array.isArray(details.xaiReasons) ? details.xaiReasons.filter(Boolean) : [];
  const newsArticles = Array.isArray(details.news) ? details.news.filter(Boolean) : [];
  const activeTabMetrics = Array.isArray(details[tab]) ? details[tab].filter(Boolean) : [];
  const tabs = getTabsFor(Boolean(stock.isEtf));
  const sessionLabel = MARKET_SESSION_LABELS[stock.marketSession] || null;

  const probabilityData = ['1W', '1M', '3M'].map((period) => ({
    period,
    UP: toFiniteNumber(details.probability?.[period]?.up) ?? 0,
    FLAT: toFiniteNumber(details.probability?.[period]?.flat) ?? 0,
    DOWN: toFiniteNumber(details.probability?.[period]?.down) ?? 0,
  }));

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{toRenderable(stock.symbol, sym)}</h1>
              {stock.isEtf && (
                <span className="text-[10px] font-bold text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded px-1.5 py-0.5">
                  ETF
                </span>
              )}
              {toRenderable(stock.name) && <span className="text-slate-400 text-sm">{toRenderable(stock.name)}</span>}
            </div>
            {toRenderable(stock.sector) && <p className="text-xs text-slate-500">{toRenderable(stock.sector)}</p>}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              {sessionLabel && (
                <div className="text-[11px] font-medium text-amber-400/90 mb-0.5">{sessionLabel}</div>
              )}
              <div className="text-2xl font-bold text-white">{priceText}</div>
              <div className={`text-sm font-medium ${changeInfo.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {changeInfo.isPositive ? '▲' : '▼'} {changeInfo.text}
              </div>
            </div>
            {stock.verdict && <VerdictBadge verdict={stock.verdict} className="text-sm px-4 py-2" />}
          </div>
        </div>

        {/* Watchlist / Portfolio actions */}
        <Card className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAddToWatchlist}
              disabled={addingToWatchlist}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {addingToWatchlist ? 'Добавяне...' : '+ Watchlist'}
            </button>

            {!showPortfolioForm && (
              <button
                onClick={() => setShowPortfolioForm(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                + Portfolio
              </button>
            )}

            {showPortfolioForm && (
              <AddToPortfolioForm onAdd={handleAddToPortfolio} onCancel={() => setShowPortfolioForm(false)} />
            )}

            <button
              onClick={() => setShowSimulator(true)}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 text-sm font-medium transition-colors"
            >
              Симулирай добавяне
            </button>
          </div>
        </Card>

        {/* XAI Explanation */}
        {stock.verdict && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              Защо препоръчваме <span className="text-blue-400">{toRenderable(stock.verdict)}</span>?
            </h2>
            <p className="text-sm text-slate-500 mb-4">AI Score: {aiScoreText}/100 — базирано на претеглена комбинация от фактори</p>
            {xaiReasons.length > 0 ? (
              <div className="space-y-2">
                {xaiReasons.map((reason, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 bg-slate-900/50 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-slate-300 flex items-center gap-2">
                      <span>{reason?.positive ? '✅' : '❌'}</span>
                      {toRenderable(reason?.label)}
                    </span>
                    <span className={`text-sm font-semibold ${reason?.positive ? 'text-green-400' : 'text-red-400'}`}>
                      {toFiniteNumber(reason?.points) !== null ? `${reason.points > 0 ? '+' : ''}${reason.points} т.` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Няма достатъчно данни за анализ.</p>
            )}
          </Card>
        )}

        {/* Probability chart */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Вероятност за посока на цената</h2>
          <ErrorBoundary
            fallback={
              <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">
                Графиката не можа да се зареди.
              </div>
            }
          >
            {/* recharts' ResponsiveContainer measures its parent via
                ResizeObserver, which doesn't exist in the Jest/jsdom test
                environment — it silently no-ops there, so this only ever
                really runs in a real browser. A percentage height depends
                on that measurement resolving correctly on first paint,
                which is unreliable on mobile browsers with dynamic
                viewport/toolbar resizing; an explicit pixel height sidesteps
                that whole class of failure. */}
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height={260} minWidth={280} minHeight={260}>
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
          </ErrorBoundary>
        </Card>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-4 bg-slate-800/60 border border-slate-700 rounded-xl p-1">
          {tabs.map((t) => (
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
          {activeTabMetrics.length > 0 ? (
            activeTabMetrics.map((metric, i) => (
              <MetricRow key={i} label={metric?.label || ''} value={metric?.value ?? 'N/A'} good={Boolean(metric?.good)} />
            ))
          ) : (
            <p className="text-sm text-slate-500">Няма данни за този раздел.</p>
          )}
        </Card>

        {tab === 'sentiment' && newsArticles.length > 0 && (
          <Card className="mt-6">
            <h2 className="text-lg font-semibold text-white mb-4">Скорошни новини</h2>
            <div className="space-y-3">
              {newsArticles.map((article, i) => (
                <a
                  key={i}
                  href={article?.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-slate-900/50 hover:bg-slate-900 rounded-lg px-4 py-3 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-xs text-blue-400 font-medium">{toRenderable(article?.source)}</span>
                    {article?.publishedAt && <span className="text-xs text-slate-500">{timeAgo(article.publishedAt)}</span>}
                  </div>
                  <h3 className="text-sm text-slate-200 font-medium">{toRenderable(article?.title)}</h3>
                </a>
              ))}
            </div>
          </Card>
        )}
      </div>
      {showSimulator && <SimulatorModal symbol={sym} onClose={() => setShowSimulator(false)} />}
    </div>
  );
}
