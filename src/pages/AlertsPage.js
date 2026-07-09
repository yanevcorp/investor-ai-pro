import { useState } from 'react';
import { Link } from 'react-router-dom';
import { alerts } from '../data/mockData';
import { Card, PriorityBadge } from '../components/ui';

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
const FILTERS = ['All', 'High', 'Medium', 'Low'];

const typeIcons = {
  anomaly: '⚠️',
  volume: '📊',
  ownership: '🏛️',
  sentiment: '📰',
};

export default function AlertsPage() {
  const [filter, setFilter] = useState('All');

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

        <div className="space-y-3">
          {visible.map((alert) => (
            <Card key={alert.id} className="hover:border-slate-600 transition-colors">
              <div className="flex items-start gap-4">
                <div className="text-2xl leading-none mt-0.5">{typeIcons[alert.type] || '🔔'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <PriorityBadge priority={alert.priority} />
                    <Link to={`/analysis/${alert.symbol}`} className="text-sm font-semibold text-blue-400 hover:underline">
                      {alert.symbol}
                    </Link>
                    <span className="text-xs text-slate-500">{alert.time}</span>
                  </div>
                  <h3 className="text-white font-medium mb-1">{alert.title}</h3>
                  <p className="text-sm text-slate-400">{alert.description}</p>
                </div>
              </div>
            </Card>
          ))}

          {visible.length === 0 && (
            <div className="text-center text-slate-500 py-16">Няма известия за този филтър.</div>
          )}
        </div>
      </div>
    </div>
  );
}
