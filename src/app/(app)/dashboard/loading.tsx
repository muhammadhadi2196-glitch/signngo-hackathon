export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 rounded bg-slate-200 mb-6" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="h-3 w-20 rounded bg-slate-100 mb-3" />
            <div className="h-8 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="h-5 w-5 rounded bg-slate-100 mb-3" />
            <div className="h-4 w-40 rounded bg-slate-100 mb-2" />
            <div className="h-3 w-32 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
