import { useEffect, useState } from 'react';
import api from '../lib/api';
import { SkeletonText } from './Skeleton';

function formatMoney(n) {
  if (!Number.isFinite(n) || n === 0) return '—';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TYPE_STYLES = {
  buy: 'bg-green-500/10 text-green-400 border-green-500/20',
  sell: 'bg-red-500/10 text-red-400 border-red-500/20',
  other: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

function TypeBadge({ type, label }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap ${TYPE_STYLES[type] || TYPE_STYLES.other}`}>
      {label}
    </span>
  );
}

export default function InsiderActivity({ symbol }) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .get(`/stocks/${symbol}/insider`)
      .then((res) => {
        if (!cancelled) setTransactions(Array.isArray(res.data?.transactions) ? res.data.transactions : []);
      })
      .catch(() => {
        if (!cancelled) setTransactions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading) return <SkeletonText lines={5} />;
  if (transactions.length === 0) return <p className="text-sm text-slate-500">Няма налична информация за инсайдър транзакции.</p>;

  return (
    <div className="overflow-x-auto -mx-5 px-5 -my-2">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="text-left text-xs text-slate-500 border-b border-slate-700/60">
            <th className="font-medium py-2 pr-4">Име</th>
            <th className="font-medium py-2 pr-4">Тип</th>
            <th className="font-medium py-2 pr-4">Акции</th>
            <th className="font-medium py-2 pr-4">Цена</th>
            <th className="font-medium py-2 pr-4">Обща стойност</th>
            <th className="font-medium py-2">Дата</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr key={i} className="border-b border-slate-700/40 last:border-0">
              <td className="py-2.5 pr-4 text-slate-200 font-medium">{t.name || '—'}</td>
              <td className="py-2.5 pr-4">
                <TypeBadge type={t.transactionType} label={t.transactionLabel || '—'} />
              </td>
              <td className="py-2.5 pr-4 text-slate-300 whitespace-nowrap">{Number.isFinite(t.shares) ? t.shares.toLocaleString() : '—'}</td>
              <td className="py-2.5 pr-4 text-slate-300 whitespace-nowrap">
                {Number.isFinite(t.price) && t.price > 0 ? `$${t.price.toFixed(2)}` : '—'}
              </td>
              <td className="py-2.5 pr-4 text-slate-300 whitespace-nowrap">{formatMoney(t.totalValue)}</td>
              <td className="py-2.5 text-slate-300 whitespace-nowrap">{formatDate(t.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
