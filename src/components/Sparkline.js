import { LineChart, Line } from 'recharts';
import ErrorBoundary from './ErrorBoundary';

const WIDTH = 96;
const HEIGHT = 32;

function SparklineChart({ closes }) {
  const positive = closes[closes.length - 1] >= closes[0];
  const color = positive ? '#22c55e' : '#ef4444';
  const data = closes.map((close, i) => ({ i, close }));

  return (
    <LineChart width={WIDTH} height={HEIGHT} data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
      <Line type="monotone" dataKey="close" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
    </LineChart>
  );
}

// Deliberately skips ResponsiveContainer: it measures its parent via
// ResizeObserver, which is the exact mechanism behind an earlier
// mobile-only chart crash in this app (see AnalysisPage's probability
// chart). A sparkline is always a small fixed size anyway, so recharts'
// own width/height props avoid that whole class of failure outright.
export default function Sparkline({ closes, onClick, title }) {
  const points = Array.isArray(closes) ? closes.filter((v) => Number.isFinite(v)) : [];

  if (points.length < 2) {
    return <div style={{ width: WIDTH, height: HEIGHT }} className="shrink-0" aria-hidden="true" />;
  }

  return (
    <ErrorBoundary fallback={<div style={{ width: WIDTH, height: HEIGHT }} className="shrink-0" />}>
      <button
        type="button"
        onClick={onClick}
        title={title || 'Виж пълна графика'}
        style={{ width: WIDTH, height: HEIGHT }}
        className="shrink-0 rounded-md hover:bg-slate-700/50 transition-colors"
      >
        <SparklineChart closes={points} />
      </button>
    </ErrorBoundary>
  );
}
