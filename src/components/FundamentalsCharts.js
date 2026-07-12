import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card } from './ui';
import ErrorBoundary from './ErrorBoundary';

const CHART_HEIGHT = 220;
const AXIS_PROPS = { stroke: '#64748b', tickLine: false, axisLine: false };
const TOOLTIP_STYLE = { contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' } };

function ChartCard({ title, children, empty }) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      <ErrorBoundary fallback={<div style={{ height: CHART_HEIGHT }} className="flex items-center justify-center text-sm text-slate-500">Графиката не можа да се зареди.</div>}>
        {empty ? (
          <div style={{ height: CHART_HEIGHT }} className="flex items-center justify-center text-sm text-slate-500">Няма достатъчно данни.</div>
        ) : (
          <div style={{ width: '100%', height: CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={200} minHeight={CHART_HEIGHT}>
              {children}
            </ResponsiveContainer>
          </div>
        )}
      </ErrorBoundary>
    </Card>
  );
}

function formatBillions(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(0)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n}`;
}

// financialsHistory: { revenueHistory, marginsHistory, debtVsCashHistory,
// epsHistory, peHistory (all ~10-20yr, Alpha Vantage), ratioHistory (P/E,
// P/S, P/B, EV/EBITDA — 5yr cap, FMP free tier), sectorAveragePE (FMP,
// current snapshot only, best-effort sector match) } — see
// backend/src/services/financialsHistoryService.js for the exact shape.
// null for ETFs (no income statement / balance sheet data source).
export default function FundamentalsCharts({ financialsHistory }) {
  if (!financialsHistory) {
    return <p className="text-sm text-slate-500">Няма данни за фундаментален анализ.</p>;
  }

  const {
    revenueHistory = [],
    marginsHistory = [],
    debtVsCashHistory = [],
    epsHistory = [],
    peHistory = [],
    ratioHistory = [],
    sectorAveragePE = null,
  } = financialsHistory;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ChartCard title="Ръст на приходите" empty={revenueHistory.length === 0}>
        <BarChart data={revenueHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="year" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={formatBillions} width={56} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [formatBillions(v), 'Приходи']} />
          <Bar dataKey="revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Маржове на печалба" empty={marginsHistory.length === 0}>
        <LineChart data={marginsHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="year" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} unit="%" width={44} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, '']} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Line type="monotone" dataKey="grossMarginPercent" name="Брутен" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="operatingMarginPercent" name="Оперативен" stroke="#a855f7" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="netMarginPercent" name="Нетен" stroke="#22c55e" strokeWidth={2} dot={false} />
        </LineChart>
      </ChartCard>

      <ChartCard title="Дълг срещу кеш" empty={debtVsCashHistory.length === 0}>
        <BarChart data={debtVsCashHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="year" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={formatBillions} width={56} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [formatBillions(v), name]} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Bar dataKey="debt" name="Дълг" fill="#ef4444" radius={[3, 3, 0, 0]} />
          <Bar dataKey="cash" name="Кеш" fill="#22c55e" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Ръст на EPS" empty={epsHistory.length === 0}>
        <LineChart data={epsHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="year" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={(v) => `$${v}`} width={44} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`$${v}`, 'EPS']} />
          <Line type="monotone" dataKey="eps" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ChartCard>

      <div className="md:col-span-2">
        <ChartCard title="P/E съотношение спрямо сектора" empty={peHistory.length === 0}>
          <LineChart data={peHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="year" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} width={44} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'P/E']} />
            {typeof sectorAveragePE === 'number' && (
              <ReferenceLine
                y={sectorAveragePE}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: `Сектор: ${sectorAveragePE.toFixed(1)}`, fill: '#f59e0b', fontSize: 11, position: 'insideTopRight' }}
              />
            )}
            <Line type="monotone" dataKey="pe" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ChartCard>
      </div>

      <ChartCard title="P/S и P/B съотношения" empty={ratioHistory.length === 0}>
        <LineChart data={ratioHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="year" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={44} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Line type="monotone" dataKey="ps" name="P/S" stroke="#a855f7" strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="pb" name="P/B" stroke="#ec4899" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ChartCard>

      <ChartCard title="EV/EBITDA" empty={ratioHistory.length === 0}>
        <LineChart data={ratioHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="year" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={44} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'EV/EBITDA']} />
          <Line type="monotone" dataKey="evToEbitda" stroke="#14b8a6" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ChartCard>
    </div>
  );
}
