export default function ReportsLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-28 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-44 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="h-9 w-40 bg-slate-200 rounded-lg animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          [3, 1, 4],
          [2, 5, 3],
          [5, 3, 2],
          [2, 4, 3],
        ].map((rows, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
          >
            <div className="h-3.5 w-36 bg-slate-200 rounded animate-pulse" />
            <div className="h-9 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
            <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
            <div className="space-y-2 pt-1">
              {rows.map((w, j) => (
                <div
                  key={j}
                  className="h-5 bg-slate-50 rounded animate-pulse"
                  style={{ width: `${w * 20}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
