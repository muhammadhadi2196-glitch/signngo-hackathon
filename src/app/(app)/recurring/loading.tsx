export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* PageHeader with description */}
      <div className="mb-6">
        <div className="h-6 w-48 rounded bg-slate-200 mb-1.5" />
        <div className="h-4 w-64 rounded bg-slate-200" />
      </div>

      {/* Table — Customer, Type, Frequency, Status, Next Run, Generated, actions */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="hidden md:flex border-b border-slate-200 bg-slate-50 px-4 py-3 gap-6">
          {["w-20", "w-12", "w-20", "w-12", "w-20", "w-16"].map((w, idx) => (
            <div key={idx} className={`h-3 ${w} rounded bg-slate-200`} />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3.5 border-b border-slate-100 last:border-0">
            <div className="h-4 w-28 rounded bg-slate-100" />
            <div className="hidden md:block h-5 w-14 rounded-full bg-slate-100" />
            <div className="hidden md:block h-4 w-20 rounded bg-slate-100" />
            <div className="hidden md:block h-5 w-14 rounded-full bg-slate-100" />
            <div className="hidden md:block h-4 w-20 rounded bg-slate-100 ml-auto" />
            <div className="hidden md:block h-4 w-8 rounded bg-slate-100" />
            <div className="h-6 w-6 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
