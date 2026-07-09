import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { stressTestScenarios, hiddenRisks, correlationMatrix } from '../data/mockData';
import { Card } from '../components/ui';

function corrColor(value) {
  if (value === 1) return 'bg-blue-600 text-white';
  if (value >= 0.6) return 'bg-red-500/70 text-white';
  if (value >= 0.4) return 'bg-orange-500/50 text-white';
  if (value >= 0.2) return 'bg-yellow-500/30 text-yellow-100';
  return 'bg-slate-700/40 text-slate-300';
}

const severityStyles = {
  High: 'border-red-500/30 bg-red-500/5',
  Medium: 'border-yellow-500/30 bg-yellow-500/5',
  Low: 'border-blue-500/30 bg-blue-500/5',
};

function AddHoldingForm({ onAdd }) {
  const [symbol, setSymbol] = useState('');
  const [weight, setWeight] = useState('');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symbol || !weight || !value) return;
    setSubmitting(true);
    try {
      await onAdd({ symbol, weight: Number(weight), value: Number(value) });
      setSymbol('');
      setWeight('');
      setValue('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 mb-5">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Символ</label>
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="AAPL"
          className="w-24 bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Тегло %</label>
        <input
          type="number"
          min="0"
          max="100"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="20"
          className="w-24 bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-32 bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium transition-colors"
      >
        {submitting ? 'Добавяне...' : '+ Добави'}
      </button>
    </form>
  );
}

export default function PortfolioPage() {
  const token = useAuthStore((s) => s.token);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeScenario, setActiveScenario] = useState(stressTestScenarios[0].id);
  const scenario = stressTestScenarios.find((s) => s.id === activeScenario);

  const loadPortfolio = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/portfolio');
      setHoldings(res.data.portfolio.holdings);
    } catch (err) {
      setError(err.response?.data?.message || 'Неуспешно зареждане на портфолиото.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAdd = async ({ symbol, weight, value }) => {
    const res = await api.post('/portfolio', { symbol, weight, value });
    setHoldings(res.data.portfolio.holdings);
  };

  const handleDelete = async (holdingId) => {
    const res = await api.delete(`/portfolio/${holdingId}`);
    setHoldings(res.data.portfolio.holdings);
  };

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-24 px-4 flex flex-col items-center text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-white mb-2">Влез в акаунта си</h2>
        <p className="text-slate-400 mb-6">Портфолиото е достъпно само за логнати потребители.</p>
        <Link to="/login" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
          Вход
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Портфолио</h1>
          <div className="text-right">
            <div className="text-xs text-slate-500">Обща стойност</div>
            <div className="text-xl font-bold text-white">${totalValue.toLocaleString()}</div>
          </div>
        </div>

        {/* Holdings */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Позиции</h2>

          <AddHoldingForm onAdd={handleAdd} />

          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
          {loading ? (
            <p className="text-sm text-slate-500">Зареждане...</p>
          ) : holdings.length === 0 ? (
            <p className="text-sm text-slate-500">Все още нямаш добавени позиции.</p>
          ) : (
            <div className="space-y-3">
              {holdings.map((h) => (
                <div key={h._id} className="flex items-center gap-4">
                  <span className="w-16 text-sm font-semibold text-white">{h.symbol}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${h.weight}%` }} />
                  </div>
                  <span className="w-12 text-right text-sm text-slate-400">{h.weight}%</span>
                  <span className="w-24 text-right text-sm text-slate-300">${h.value.toLocaleString()}</span>
                  <button
                    onClick={() => handleDelete(h._id)}
                    className="text-slate-500 hover:text-red-400 text-sm transition-colors"
                    title="Премахни"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Stress test */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Стрес тест на портфолиото</h2>
          <div className="flex flex-wrap gap-2 mb-5">
            {stressTestScenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveScenario(s.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  activeScenario === s.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {scenario && (
            <div>
              <p className="text-sm text-slate-400 mb-4">{scenario.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-xs text-slate-500 mb-1">Твоето портфолио</div>
                  <div className="text-2xl font-bold text-red-400">{scenario.portfolioImpact}%</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-xs text-slate-500 mb-1">Пазар (S&P 500)</div>
                  <div className="text-2xl font-bold text-red-400">{scenario.marketImpact}%</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-xs text-slate-500 mb-1">Най-засегната позиция</div>
                  <div className="text-lg font-semibold text-white">{scenario.worstHolding}</div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Hidden risks */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Скрити рискове</h2>
          <div className="space-y-3">
            {hiddenRisks.map((risk, i) => (
              <div key={i} className={`border rounded-lg p-4 ${severityStyles[risk.severity]}`}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm font-semibold text-white">{risk.title}</span>
                  <span className="text-xs font-semibold text-slate-300">{risk.severity}</span>
                </div>
                <p className="text-sm text-slate-400">{risk.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Correlation heatmap */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Корелационна карта</h2>
          <div className="overflow-x-auto">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="w-16"></th>
                  {correlationMatrix.symbols.map((s) => (
                    <th key={s} className="text-xs text-slate-400 font-medium px-2 pb-2">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlationMatrix.data.map((row, i) => (
                  <tr key={i}>
                    <td className="text-xs text-slate-400 font-medium pr-3">{correlationMatrix.symbols[i]}</td>
                    {row.map((value, j) => (
                      <td key={j} className="p-1">
                        <div className={`w-14 h-10 flex items-center justify-center rounded-md text-xs font-semibold ${corrColor(value)}`}>
                          {value.toFixed(2)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
