import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Card, VerdictBadge } from '../components/ui';

export default function WatchlistPage() {
  const token = useAuthStore((s) => s.token);
  const [symbols, setSymbols] = useState([]);
  const [stocksBySymbol, setStocksBySymbol] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newSymbol, setNewSymbol] = useState('');

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
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-24 px-4 flex flex-col items-center text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-white mb-2">Влез в акаунта си</h2>
        <p className="text-slate-400 mb-6">Watchlist-ът е достъпен само за логнати потребители.</p>
        <Link to="/login" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
          Вход
        </Link>
      </div>
    );
  }

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
            {symbols.map((sym) => {
              const stock = stocksBySymbol[sym];
              const isPositive = stock ? stock.change >= 0 : true;
              return (
                <Card key={sym} className="hover:border-slate-600 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <Link to={`/analysis/${sym}`} className="flex-1 min-w-0">
                      <div className="text-white font-semibold">{sym}</div>
                      <div className="text-sm text-slate-500">{stock ? stock.name : 'Няма данни в API-то'}</div>
                    </Link>
                    {stock && (
                      <>
                        <div className="text-right">
                          <div className="text-white font-medium">${stock.price.toFixed(2)}</div>
                          <div className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '▲' : '▼'} {Math.abs(stock.changePercent).toFixed(2)}%
                          </div>
                        </div>
                        <VerdictBadge verdict={stock.verdict} />
                      </>
                    )}
                    <button
                      onClick={() => handleRemove(sym)}
                      className="text-slate-500 hover:text-red-400 text-sm transition-colors"
                      title="Премахни"
                    >
                      ✕
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
