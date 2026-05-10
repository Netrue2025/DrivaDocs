export default function DashboardLoading() {
  return (
    <div className="min-w-0">
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded border border-brand-900/10 bg-white shadow-sm" />
        ))}
      </div>
      <div className="mt-6 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="h-5 w-44 animate-pulse rounded bg-brand-900/10" />
        <div className="mt-5 grid gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded bg-brand-50" />
          ))}
        </div>
      </div>
    </div>
  );
}
