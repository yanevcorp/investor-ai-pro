import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { timeAgo } from '../utils/time';
import { Card, PriorityBadge } from '../components/ui';
import AlertDetail from '../components/AlertDetail';

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
const FILTERS = ['All', 'High', 'Medium', 'Low'];

const typeIcons = {
  anomaly: '⚠️',
  volume: '📊',
  ownership: '🏛️',
  sentiment: '📰',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  // Once a card has been opened, its detail view stays mounted (just
  // hidden via the height animation) on collapse — avoids refetching
  // history/news every time the user toggles it back open.
  const [mountedIds, setMountedIds] = useState(() => new Set());

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get('/alerts')
      .then((res) => setAlerts(res.data.alerts))
      .catch((err) => setError(err.response?.data?.message || 'Неуспешно зареждане на известията.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = async (id) => {
    await api.patch(`/alerts/${id}/dismiss`);
    setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, dismissed: true } : a)));
  };

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMountedIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  };

  const visible = alerts
    .filter((a) => filter === 'All' || a.priority === filter)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 px-4 pb-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-white">Умни известия</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Само реални аномалии — без спам за всяко движение на цената.
        </p>

        <div className="flex gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                filter === f
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500">Зареждане...</p>
          ) : (
            visible.map((alert) => {
              const isOpen = expandedIds.has(alert._id);
              return (
                <Card
                  key={alert._id}
                  className={`hover:border-slate-600 transition-colors ${alert.dismissed ? 'opacity-50' : ''}`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => toggleExpanded(alert._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpanded(alert._id);
                      }
                    }}
                    className="flex items-start gap-4 cursor-pointer select-none -m-1 p-1 rounded-lg"
                  >
                    <div className="text-2xl leading-none mt-0.5">{typeIcons[alert.type] || '🔔'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <PriorityBadge priority={alert.priority} />
                        <Link
                          to={`/analysis/${alert.symbol}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-semibold text-blue-400 hover:underline"
                        >
                          {alert.symbol}
                        </Link>
                        <span className="text-xs text-slate-500">{timeAgo(alert.createdAt)}</span>
                      </div>
                      <h3 className="text-white font-medium">{alert.title}</h3>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {!alert.dismissed && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(alert._id);
                          }}
                          className="text-xs text-slate-500 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg px-2.5 py-1.5 min-h-[36px] transition-colors"
                        >
                          Отбележи
                        </button>
                      )}
                      <span
                        aria-hidden="true"
                        className={`text-slate-500 text-lg leading-none transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      >
                        ▾
                      </span>
                    </div>
                  </div>

                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">{mountedIds.has(alert._id) && <AlertDetail alert={alert} />}</div>
                  </div>
                </Card>
              );
            })
          )}

          {!loading && visible.length === 0 && (
            <div className="text-center text-slate-500 py-16">Няма известия за този филтър.</div>
          )}
        </div>
      </div>
    </div>
  );
}
