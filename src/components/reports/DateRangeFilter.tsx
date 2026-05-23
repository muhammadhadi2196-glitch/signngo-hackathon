"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

const RANGE_OPTIONS = [
  { value: "ytd", label: "Year to date" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_30", label: "Last 30 days" },
  { value: "last_90", label: "Last 90 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

interface Props {
  range: string;
  from?: string;
  to?: string;
}

export function DateRangeFilter({ range, from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  function navigate(newRange: string, newFrom?: string, newTo?: string) {
    const params = new URLSearchParams();
    params.set("range", newRange);
    if (newRange === "custom") {
      if (newFrom) params.set("from", newFrom);
      if (newTo) params.set("to", newTo);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={range}
        onChange={(e) => navigate(e.target.value)}
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        {RANGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {range === "custom" && (
        <>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              if (customTo) navigate("custom", e.target.value, customTo);
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <span className="text-sm text-slate-400">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              if (customFrom) navigate("custom", customFrom, e.target.value);
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </>
      )}
    </div>
  );
}
