import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Card, VerdictBadge } from '../components/ui';
import Sparkline from '../components/Sparkline';
import ExpandedChartModal from '../components/ExpandedChartModal';
import useStockHistories from '../hooks/useStockHistories';
import useLiveQuotes from '../hooks/useLiveQuotes';
import useFlashOnChange from '../hooks/useFlashOnChange';

const LIVE_QUOTE_INTERVAL_MS = 60000;

// One row per symbol so useFlashOnChange (a hook) can be called per-item
// without violating the rules of hooks inside the list's .map().
function WatchlistRow({ sym, stock, history, liveQuote, onExpand, onRemove }) {
  const price = liveQuote?.price ?? stock?.price ?? null;
  const changePercent = liveQuote?.changePercent ?? stock?.changePercent ?? null;
  const flash = useFlashOnChange(price);
  const isPositive = price != null ? (liveQuote?.change ?? stock?.change ?? 0) >= 0 : true;

  // The sparkline's history is daily-resolution (see historyService), so a
  // 60s poll can't meaningfully redraw the whole line — but replacing its
  // last point with the live price keeps that point genuinely current and
  // updates the line's up/down color in real time, without fabricating
  // intraday data we don't have.
  const closes = Array.isArray(history?.sparkline) ? history.sparkline : [];
  const liveCloses = price != null && closes.length > 0 ? [...closes.slice(0, -1), price] : closes;

  return (
    <Card className="hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <Link to={`/analysis/${sym}`} className="flex-1 min-w-0">
          <div className="text-white font-semibold">{sym}</div>
          <div className="text-sm text-slate-500">{stock ? stock.name : 'Няма данни в API-то'}</div>
        </Link>
        <Sparkline closes={liveCloses} onClick={onExpand} title={`Виж пълна графика за ${sym}`} />
        {stock && (
          <>
            <div
              className={`text-right rounded-md px-1 -mx-1 ${
                flash === 'up' ? 'animate-flash-up' : flash === 'down' ? 'animate-flash-down' : ''
              }`}
            >
              <div className="text-white font-medium">${price != null ? price.toFixed(2) : 'N/A'}</div>
              <div className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '▲' : '▼'} {changePercent != null ? Math.abs(changePercent).toFixed(2) : '0.00'}%
              </div>
            </div>
            <VerdictBadge verdict={stock.verdict} />
          </>
        )}
        <button onClick={onRemove} className="text-slate-500 hover:text-red-400 text-sm transition-colors" title="Премахни">
          ✕
        </button>
      </div>
    </Card>
  );
}

export default function WatchlistPage() {
  const [symbols, setSymbols] = useState([]);
  const [stocksBySymbol, setStocksBySymbol] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [expandedSymbol, setExpandedSymbol] = useState(null);
  const historiesBySymbol = useStockHistories(symbols);
  const liveQuotesBySymbol = useLiveQuotes(symbols, LIVE_QUOTE_INTERVAL_MS);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [watchlistRes, stocksRes] = await Promise.all([api.get('/watchlist'), api.get('/stocks')]);
      setSymbols(watchlistRes.data.watchlist.symbols);
      const map = {};
      stocksRes.data.stocks.forEach((s) => {
        map[s.symbol] = s;
      });
      setStocksBySymbol(map);
    } catch (err) {
      setError(err.response?.data?.message || 'Неуспешно зареждане на watchlist-а.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    const res = await api.post('/watchlist', { symbol: newSymbol.trim() });
    setSymbols(res.data.watchlist.symbols);
    setNewSymbol('');
  };

  const handleRemove = async (symbol) => {
    const res = await api.delete(`/watchlist/${symbol}`);
    setSymbols(res.data.watchlist.symbols);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 px-4 pb-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Watchlist</h1>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            placeholder="Добави тикер, напр. NVDA"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Добави
          </button>
        </form>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {loading ? (
          <p className="text-sm text-slate-500">Зареждане...</p>
        ) : symbols.length === 0 ? (
          <p className="text-sm text-slate-500">Watchlist-ът е празен.</p>
        ) : (
          <div className="space-y-3">
            {symbols.map((sym) => (
              <WatchlistRow
                key={sym}
                sym={sym}
                stock={stocksBySymbol[sym]}
                history={historiesBySymbol[sym]}
                liveQuote={liveQuotesBySymbol[sym]}
                onExpand={() => setExpandedSymbol(sym)}
                onRemove={() => handleRemove(sym)}
              />
            ))}
          </div>
        )}
      </div>
      {expandedSymbol && (
        <ExpandedChartModal symbol={expandedSymbol} onClose={() => setExpandedSymbol(null)} />
      )}
    </div>
  );
}
