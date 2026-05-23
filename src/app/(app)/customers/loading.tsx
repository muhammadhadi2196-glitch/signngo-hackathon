export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* PageHeader */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="h-6 w-28 rounded bg-slate-200" />
        <div className="h-9 w-32 rounded-md bg-slate-200" />
      </div>

      {/* Toolbar: search + export */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-9 rounded-lg bg-slate-200" />
        <div className="h-9 w-20 rounded-lg bg-slate-200" />
      </div>

      {/* Table — Name, Email, Phone, Invoices, Quotes, actions */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="hidden sm:flex border-b border-slate-200 bg-slate-50 px-4 py-3 gap-6">
          <div className="h-3 w-10 rounded bg-slate-200" />
          <div className="h-3 w-10 rounded bg-slate-200" />
          <div className="h-3 w-10 rounded bg-slate-200" />
          <div className="h-3 w-14 rounded bg-slate-200 ml-auto" />
          <div className="h-3 w-12 rounded bg-slate-200" />
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3 border-b border-slate-100 last:border-0">
            <div className="h-4 w-32 rounded bg-slate-100" />
            <div className="hidden sm:block h-4 w-40 rounded bg-slate-100" />
            <div className="hidden sm:block h-4 w-24 rounded bg-slate-100" />
            <div className="h-4 w-6 rounded bg-slate-100 ml-auto" />
            <div className="hidden sm:block h-4 w-6 rounded bg-slate-100" />
            <div className="h-6 w-12 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
