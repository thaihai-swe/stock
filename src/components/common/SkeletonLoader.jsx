export function Shimmer({ className = '' }) {
  return (
    <div className={`bg-slate-200/80 dark:bg-slate-800/80 animate-pulse rounded-lg ${className}`} />
  );
}

export function DashboardHeroSkeleton() {
  return (
    <div className="card-base rounded-3xl p-5 sm:p-6 space-y-5 animate-pulse border-slate-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="card-nested p-4 space-y-3 min-h-[140px]">
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="card-nested p-4 space-y-3 min-h-[140px]">
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function KpiMatrixSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card-base rounded-3xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
          <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="card-base rounded-3xl overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-none">
            <div className="flex items-center gap-3">
              <div className="h-8 w-14 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="space-y-1">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <DashboardHeroSkeleton />
      <KpiMatrixSkeleton />
      <TableSkeleton rows={4} />
    </div>
  );
}

export function TabSkeleton({ title = 'Đang tải dữ liệu...' }) {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="card-base p-5 flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-56 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-3.5 w-72 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-base p-6 h-64 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl" />
        <div className="card-base p-6 h-64 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl" />
      </div>
      <TableSkeleton rows={4} />
    </div>
  );
}
