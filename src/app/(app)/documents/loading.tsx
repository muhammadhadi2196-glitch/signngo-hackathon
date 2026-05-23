export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 rounded bg-slate-200 mb-6" />
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-slate-100 last:border-0">
            <div className="h-4 w-48 rounded bg-slate-100" />
            <div className="h-4 w-32 rounded bg-slate-100" />
            <div className="h-5 w-16 rounded-full bg-slate-100 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
