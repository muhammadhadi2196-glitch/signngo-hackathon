export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 rounded bg-slate-200 mb-6" />
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-16 rounded-full bg-slate-200" />
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-slate-100 last:border-0">
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="h-4 w-32 rounded bg-slate-100" />
            <div className="h-4 w-20 rounded bg-slate-100" />
            <div className="h-4 w-16 rounded bg-slate-100 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
