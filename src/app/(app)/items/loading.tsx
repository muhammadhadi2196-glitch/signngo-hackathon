export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* PageHeader with description */}
      <div className="mb-6">
        <div className="h-6 w-36 rounded bg-slate-200 mb-1.5" />
        <div className="h-4 w-72 rounded bg-slate-200" />
      </div>

      {/* Toolbar: search + New item */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-9 rounded-lg bg-slate-200" />
        <div className="h-9 w-24 rounded-md bg-slate-200" />
      </div>

      {/* Table — Name, Category (sm+), Price, Tax (sm+), actions */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 py-3 gap-6">
          <div className="h-3 w-10 rounded bg-slate-200" />
          <div className="hidden sm:block h-3 w-16 rounded bg-slate-200" />
          <div className="h-3 w-10 rounded bg-slate-200 ml-auto" />
          <div className="hidden sm:block h-3 w-8 rounded bg-slate-200" />
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3 border-b border-slate-100 last:border-0">
            <div>
              <div className="h-4 w-32 rounded bg-slate-100 mb-1" />
              <div className="h-3 w-48 rounded bg-slate-100" />
            </div>
            <div className="hidden sm:block h-4 w-20 rounded bg-slate-100" />
            <div className="h-4 w-16 rounded bg-slate-100 ml-auto" />
            <div className="hidden sm:block h-4 w-10 rounded bg-slate-100" />
            <div className="h-6 w-12 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
