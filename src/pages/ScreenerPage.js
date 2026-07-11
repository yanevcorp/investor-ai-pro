import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../lib/api';
import { VerdictBadge } from '../components/ui';

const EXAMPLE_QUERIES = [
  'Подценени tech акции',
  'Акции с insider buying',
  'ETF-и с нисък разход',
  'Компании с ръст над 20%',
];

export default function ScreenerPage() {
  const location = useLocation();
  const [query, setQuery] = useState(location.state?.query || '');
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState('');
  const [unsupportedCriteria, setUnsupportedCriteria] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSearch = async (term) => {
    setLoading(true);
    setError('');
    setSearched(true);
    setSummary('');
    setUnsupportedCriteria([]);
    try {
      const res = await api.post('/stocks/ai-search', { query: term });
      setResults(res.data.stocks || []);
      setSummary(res.data.summary || '');
      setUnsupportedCriteria(res.data.unsupportedCriteria || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Неуспешно търсене.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.query) runSearch(location.state.query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    runSearch(query.trim());
  };

  const handleExampleClick = (example) => {
    setQuery(example);
    runSearch(example);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Screener</h1>
        <p className="text-sm text-slate-500 mb-6">
          Опиши какво търсиш на естествен език — AI ще прегледа наличните акции вместо теб.
        </p>

        <form onSubmit={handleSubmit} className="relative mb-8">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="напр. Намери подценени tech компании с дълг под 20%"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 pl-5 pr-14 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            🔍
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-sm text-slate-500 mr-1">Примери:</span>
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:border-blue-500 hover:text-white transition-colors"
            >
              {example}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {searched && !loading && summary && (
          <div className="mb-4 text-sm text-slate-300 bg-slate-800/40 border border-slate-700 rounded-lg px-4 py-3">
            <span className="text-blue-400 font-medium">AI:</span> {summary}
            {unsupportedCriteria.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">Без данни за: {unsupportedCriteria.join(', ')}</p>
            )}
          </div>
        )}

        {!searched ? (
          <div className="flex flex-col items-center text-center text-slate-500 py-20">
            <div className="text-5xl mb-4">🧮</div>
            <p>Въведи критерии, за да видиш резултатите от AI screener-а.</p>
          </div>
        ) : loading ? (
          <p className="text-sm text-slate-500 text-center py-20">Търсене...</p>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center text-center text-slate-500 py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p>Няма резултати за "{query}".</p>
          </div>
        ) : (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-left">
                    <th className="px-4 py-3 font-medium">Символ</th>
                    <th className="px-4 py-3 font-medium">Компания</th>
                    <th className="px-4 py-3 font-medium">Цена</th>
                    <th className="px-4 py-3 font-medium">Промяна</th>
                    <th className="px-4 py-3 font-medium">AI Score</th>
                    <th className="px-4 py-3 font-medium">Препоръка</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row) => (
                    <tr key={row.symbol} className="border-b border-slate-700/60 last:border-0 hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <Link to={`/analysis/${row.symbol}`} className="font-semibold text-blue-400 hover:underline">
                          {row.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.name}</td>
                      <td className="px-4 py-3 text-slate-300">${row.price.toFixed(2)}</td>
                      <td className={`px-4 py-3 font-medium ${row.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {row.changePercent >= 0 ? '+' : ''}{row.changePercent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white">{row.aiScore}</span>
                        <span className="text-slate-500">/100</span>
                      </td>
                      <td className="px-4 py-3">
                        <VerdictBadge verdict={row.verdict} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
