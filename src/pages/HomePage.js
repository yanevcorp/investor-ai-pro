import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const QUICK_SUGGESTIONS = ['RKLB', 'PLTR', 'MSTR', 'AAPL', 'TSLA'];
const SEARCH_DEBOUNCE_MS = 300;

export default function HomePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('nl');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  // Debounced search responses can resolve out of order (a fast second
  // keystroke's request can come back before the first's) — this guards
  // against a stale response overwriting a newer one.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (tab !== 'ticker') {
      setSuggestions([]);
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = setTimeout(() => {
      api
        .get('/stocks/search', { params: { q: trimmed } })
        .then((res) => {
          if (requestIdRef.current !== requestId) return;
          setSuggestions(Array.isArray(res.data?.results) ? res.data.results : []);
          setActiveIndex(-1);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setSuggestions([]);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, tab]);

  useEffect(() => {
    function handleOutsideInteraction(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    // touchstart alongside mousedown: some mobile browsers/in-app webviews
    // don't reliably synthesize a mousedown from a tap, so relying on
    // mousedown alone can leave the dropdown stuck open after tapping
    // elsewhere on a real phone.
    document.addEventListener('mousedown', handleOutsideInteraction);
    document.addEventListener('touchstart', handleOutsideInteraction);
    return () => {
      document.removeEventListener('mousedown', handleOutsideInteraction);
      document.removeEventListener('touchstart', handleOutsideInteraction);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setShowSuggestions(false);
    if (tab === 'ticker') {
      navigate(`/analysis/${trimmed.toUpperCase()}`);
      return;
    }
    navigate('/screener', { state: { query: trimmed } });
  };

  const handleSelectSuggestion = (symbol) => {
    setShowSuggestions(false);
    setSuggestions([]);
    navigate(`/analysis/${symbol}`);
  };

  const handleKeyDown = (e) => {
    if (tab !== 'ticker' || !showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[activeIndex].symbol);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
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

        <div ref={containerRef} className="relative mb-6">
          <form onSubmit={handleSubmit} className="relative">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
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

          {tab === 'ticker' && showSuggestions && suggestions.length > 0 && (
            // z-[60]: above Navbar/BottomNav (z-50) and InstallBanner (z-40).
            // On a real phone the on-screen keyboard shrinks the visible
            // viewport enough that this dropdown's position can overlap the
            // fixed bottom nav — at a lower z-index it rendered completely
            // hidden behind that opaque bar instead of on top of it.
            <ul className="absolute left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[60] text-left max-h-80 overflow-y-auto">
              {suggestions.map((s, i) => (
                <li key={`${s.symbol}-${i}`}>
                  <button
                    type="button"
                    onClick={() => handleSelectSuggestion(s.symbol)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[44px] text-left transition-colors ${
                      i === activeIndex ? 'bg-slate-700' : 'hover:bg-slate-700/60'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-white shrink-0">{s.symbol}</span>
                      <span className="text-sm text-slate-400 truncate">{s.name}</span>
                    </span>
                    <span className="shrink-0 flex items-center gap-1.5">
                      {s.isEtf && (
                        <span className="text-[10px] font-bold text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded px-1.5 py-0.5">
                          ETF
                        </span>
                      )}
                      {s.type && <span className="text-xs text-slate-500">{s.type}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
