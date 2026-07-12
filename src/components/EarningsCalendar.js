import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Card } from './ui';
import { SkeletonText } from './Skeleton';

function formatMoney(n) {
  if (!Number.isFinite(n)) return 'N/A';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function SurpriseBadge({ percent }) {
  if (!Number.isFinite(percent)) return <span className="text-slate-500">N/A</span>;
  const positive = percent >= 0;
  return (
    <span className={`font-medium ${positive ? 'text-green-400' : 'text-red-400'}`}>
      {positive ? '+' : ''}
      {percent.toFixed(1)}%
    </span>
  );
}

export default function EarningsCalendar({ symbol }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .get(`/stocks/${symbol}/earnings`)
      .then((res) => {
        if (!cancelled) setData(res.data && typeof res.data === 'object' ? res.data : null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const next = data?.next || null;
  const history = Array.isArray(data?.history) ? data.history : [];

  return (
    <Card>
      <h2 className="text-lg font-semibold text-white mb-4">Предстоящи отчети</h2>

      {loading ? (
        <SkeletonText lines={4} />
      ) : !next && history.length === 0 ? (
        <p className="text-sm text-slate-500">Няма налична информация за отчети.</p>
      ) : (
        <div className="space-y-5">
          {next && (
            <div className="bg-slate-900/50 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500 mb-0.5">Следващ отчет</div>
                <div className="text-sm font-semibold text-white">{formatDate(next.date)}</div>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Очакван EPS</div>
                  <div className="text-white font-medium">{Number.isFinite(next.epsEstimated) ? `$${next.epsEstimated.toFixed(2)}` : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Очаквани приходи</div>
                  <div className="text-white font-medium">{formatMoney(next.revenueEstimated)}</div>
                </div>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-700/60">
                    <th className="font-medium py-2 pr-4">Дата</th>
                    <th className="font-medium py-2 pr-4">EPS (реален/очакван)</th>
                    <th className="font-medium py-2 pr-4">Изненада EPS</th>
                    <th className="font-medium py-2 pr-4">Приходи (реални/очаквани)</th>
                    <th className="font-medium py-2">Изненада приходи</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((q) => (
                    <tr key={q.date} className="border-b border-slate-700/40 last:border-0">
                      <td className="py-2.5 pr-4 text-slate-300 whitespace-nowrap">{formatDate(q.date)}</td>
                      <td className="py-2.5 pr-4 text-slate-300 whitespace-nowrap">
                        ${Number(q.epsActual).toFixed(2)} / {Number.isFinite(q.epsEstimated) ? `$${q.epsEstimated.toFixed(2)}` : 'N/A'}
                      </td>
                      <td className="py-2.5 pr-4">
                        <SurpriseBadge percent={q.epsSurprisePercent} />
                      </td>
                      <td className="py-2.5 pr-4 text-slate-300 whitespace-nowrap">
                        {formatMoney(q.revenueActual)} / {formatMoney(q.revenueEstimated)}
                      </td>
                      <td className="py-2.5">
                        <SurpriseBadge percent={q.revenueSurprisePercent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
