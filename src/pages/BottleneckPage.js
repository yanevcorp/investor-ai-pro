import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Card } from '../components/ui';

function ScoreBadge({ score }) {
  const tone =
    score >= 40
      ? 'bg-red-500/15 text-red-400 border-red-500/30'
      : score >= 20
      ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
      : 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold whitespace-nowrap ${tone}`}>
      -{score} т.
    </span>
  );
}

function BottleneckCard({ item }) {
  const [showAlternatives, setShowAlternatives] = useState(false);

  return (
    <Card className="mb-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{item.symbol}</span>
            <span className="text-xs text-slate-500">{item.sector || 'Без сектор'}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Тегло {item.weight}% · AI резултат {item.aiScore}/100
          </div>
        </div>
        <ScoreBadge score={item.bottleneckScore} />
      </div>

      <ul className="space-y-1.5 mb-3">
        {item.reasons.map((reason, i) => (
          <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>

      {item.impact != null && item.impact > 0 && (
        <div className="text-sm text-red-400 font-medium mb-3">
          Влияние върху резултата на портфолиото: -{Math.round(item.impact)} точки
        </div>
      )}

      <button
        onClick={() => setShowAlternatives((v) => !v)}
        disabled={item.alternatives.length === 0}
        className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {showAlternatives ? 'Скрий алтернативи' : 'Виж алтернативи'}
      </button>

      {showAlternatives && (
        <div className="mt-3 space-y-2">
          {item.alternatives.length === 0 ? (
            <p className="text-sm text-slate-500">Няма намерени алтернативи в същия сектор.</p>
          ) : (
            item.alternatives.map((alt) => (
              <div key={alt.symbol} className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm font-semibold text-white">{alt.symbol}</span>
                  <span className="text-xs text-slate-500 ml-2">{alt.name}</span>
                </div>
                <span className="text-sm font-semibold text-green-400">{alt.aiScore}/100</span>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}

export default function BottleneckPage() {
  const [bottlenecks, setBottlenecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/portfolio/bottlenecks');
        setBottlenecks(res.data.bottlenecks || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Неуспешно зареждане на анализа.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 px-4 pb-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">Акции спиращи растежа ти</h1>
        <p className="text-sm text-slate-500 mb-6">
          Позициите, които теглят надолу общия резултат на портфолиото ти.
        </p>

        {loading ? (
          <p className="text-sm text-slate-500">Зареждане...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : bottlenecks.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-400">
              Няма открити тесни места. Портфолиото ти изглежда добре балансирано.
            </p>
          </Card>
        ) : (
          bottlenecks.map((item) => <BottleneckCard key={item.symbol} item={item} />)
        )}
      </div>
    </div>
  );
}
