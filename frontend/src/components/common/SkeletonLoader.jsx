/**
 * Enterprise Skeleton Loading Placeholders
 */

export function SkeletonBox({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl ${className}`}
    />
  );
}

export function SkeletonCard({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm space-y-4"
        >
          <div className="flex justify-between items-center">
            <SkeletonBox className="w-20 h-6 rounded-full" />
            <SkeletonBox className="w-16 h-4" />
          </div>
          <SkeletonBox className="w-3/4 h-7" />
          <SkeletonBox className="w-1/2 h-4" />
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
            <SkeletonBox className="w-24 h-4" />
            <SkeletonBox className="w-28 h-8 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full border border-slate-200/80 dark:border-slate-800 rounded-3xl bg-white/70 dark:bg-slate-900/70 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBox key={i} className="flex-1 h-5" />
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonBox key={c} className="flex-1 h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm space-y-3"
        >
          <SkeletonBox className="w-24 h-3" />
          <SkeletonBox className="w-16 h-8" />
          <SkeletonBox className="w-32 h-3" />
        </div>
      ))}
    </div>
  );
}

export default {
  Box: SkeletonBox,
  Card: SkeletonCard,
  Table: SkeletonTable,
  Stats: SkeletonStats,
};
