import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const QUICK_SUGGESTIONS = ['RKLB', 'PLTR', 'MSTR', 'AAPL', 'TSLA'];

export default function HomePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('nl');
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (tab === 'ticker') {
      navigate(`/analysis/${trimmed.toUpperCase()}`);
      return;
    }
    navigate('/screener', { state: { query: trimmed } });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center px-4 pt-20 pb-16">
      <div className="w-full max-w-3xl text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Открий следващата си печеливша инвестиция
        </h1>
        <p className="text-slate-400 mb-8">
          AI-задвижван анализ на акции с обяснимост в реално време
        </p>

        <div className="inline-flex bg-slate-800 rounded-xl p-1 mb-6 border border-slate-700">
          <button
            onClick={() => setTab('nl')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'nl' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Natural Language
          </button>
          <button
            onClick={() => setTab('ticker')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'ticker' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ticker Search
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === 'nl'
                ? 'Намери ми подценени tech компании с нисък дълг...'
                : 'Въведи тикер, напр. AAPL, TSLA, RKLB...'
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-5 pl-6 pr-16 text-base md:text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-xl"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            🔍
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-16">
          <span className="text-sm text-slate-500 mr-1">Бързи предложения:</span>
          {QUICK_SUGGESTIONS.map((sym) => (
            <button
              key={sym}
              onClick={() => navigate(`/analysis/${sym}`)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:border-blue-500 hover:text-white transition-colors"
            >
              {sym}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center text-slate-600">
          <div className="text-6xl mb-4">📈</div>
          <p className="text-slate-500 max-w-md">
            Потърси компания по тикер или опиши какво търсиш на естествен език —
            AI ще анализира фундаментали, техника, сентимент и макро фактори за теб.
          </p>
        </div>
      </div>
    </div>
  );
}
