// React throws "Objects are not valid as a React child" if a non-primitive
// ever lands in JSX — optional chaining doesn't protect against this since
// the field exists, it's just the wrong shape. API-sourced values (verdict,
// metric label/value, etc.) go through this before being rendered.
export function toRenderable(value, fallback = '') {
  return typeof value === 'string' || typeof value === 'number' ? value : fallback;
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-slate-800/60 border border-slate-700 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

const verdictStyles = {
  'STRONG BUY': 'bg-green-500/15 text-green-400 border-green-500/30',
  BUY: 'bg-green-500/10 text-green-400 border-green-500/20',
  HOLD: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  SELL: 'bg-red-500/10 text-red-400 border-red-500/20',
  'STRONG SELL': 'bg-red-500/15 text-red-400 border-red-500/30',
};

export function VerdictBadge({ verdict, className = '' }) {
  const text = toRenderable(verdict);
  const style = verdictStyles[text] || verdictStyles.HOLD;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg border text-xs font-bold tracking-wide ${style} ${className}`}>
      {text}
    </span>
  );
}

const priorityStyles = {
  High: 'bg-red-500/10 text-red-400 border-red-500/20',
  Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export function PriorityBadge({ priority }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${priorityStyles[priority]}`}>
      {priority}
    </span>
  );
}

export function Indicator({ good, children }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{good ? '✅' : '❌'}</span>
      <span>{children}</span>
    </span>
  );
}

export function MetricRow({ label, value, good }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-700/60 last:border-0">
      <span className="text-sm text-slate-400">{toRenderable(label)}</span>
      <span className={`text-sm font-medium flex items-center gap-1.5 ${good ? 'text-green-400' : 'text-red-400'}`}>
        <span>{good ? '✅' : '❌'}</span>
        {toRenderable(value, 'N/A')}
      </span>
    </div>
  );
}
