"use client";

import { useEffect, useRef } from "react";
import { MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

interface PropertyEstimatorInputProps {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  disabled?: boolean;
}

const EXAMPLES: string[] = [
  "742 Springbank Hill SW, Calgary",
  "1600 Pennsylvania Ave NW, Washington",
  "10 Downing St, London",
];

export function PropertyEstimatorInput({
  value,
  onChange,
  onAnalyze,
  disabled = false,
}: PropertyEstimatorInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canAnalyze = value.trim().length > 5 && !disabled;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
          Where's the property?
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Drop in an address and Bob will pull a satellite image, measure the
          lot, lawn, driveway, and roof, then build a quote tuned to those
          measurements.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canAnalyze) onAnalyze();
        }}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2",
          "transition-all duration-200",
          "focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"
        )}
      >
        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="742 Springbank Hill SW, Calgary"
          disabled={disabled}
          className="flex-1 bg-transparent px-1 py-1 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!canAnalyze}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white",
            "bg-gradient-to-br from-blue-600 to-blue-800",
            "shadow-sm shadow-blue-500/30",
            "transition-all duration-200",
            "hover:scale-[1.02] hover:shadow-blue-500/50",
            "active:scale-[0.99]",
            "disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none disabled:hover:scale-100 disabled:cursor-not-allowed"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Analyze
        </button>
      </form>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Try one of these
        </p>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onChange(ex)}
              disabled={disabled}
              className={cn(
                "rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600",
                "transition-all duration-200",
                "hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
