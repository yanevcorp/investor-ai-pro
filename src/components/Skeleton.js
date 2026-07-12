export function Skeleton({ className = '' }) {
  return (
    <div
      className={`rounded-md bg-slate-700/50 bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.15),transparent)] bg-[length:400px_100%] bg-no-repeat animate-shimmer ${className}`}
    />
  );
}

export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ rows = 3, className = '' }) {
  return (
    <div className={`bg-slate-800/60 border border-slate-700 rounded-xl p-5 ${className}`}>
      <Skeleton className="h-4 w-1/3 mb-4" />
      <SkeletonText lines={rows} />
    </div>
  );
}
