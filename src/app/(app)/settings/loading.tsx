export default function Loading() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Logo upload area */}
      <div className="h-20 w-20 rounded-xl bg-slate-200" />

      {/* 6 labeled text fields */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i}>
          <div className="h-3 w-24 rounded bg-slate-200 mb-2" />
          <div className="h-9 w-full rounded-lg bg-slate-200" />
        </div>
      ))}

      {/* 2 textareas */}
      {[1, 2].map((i) => (
        <div key={i}>
          <div className="h-3 w-32 rounded bg-slate-200 mb-2" />
          <div className="h-20 w-full rounded-lg bg-slate-200" />
        </div>
      ))}

      {/* Save button */}
      <div className="h-9 w-24 rounded-md bg-slate-200" />
    </div>
  );
}
