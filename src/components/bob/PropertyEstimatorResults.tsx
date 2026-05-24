"use client";

import { useEffect, useState } from "react";
import { Home, Leaf, Car, Layers, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  PropertyConfidence,
  PropertyEstimateResult,
} from "@/lib/bob/types";

interface PropertyEstimatorResultsProps {
  result: PropertyEstimateResult;
  onGenerateQuote: () => void;
}

const COUNT_UP_DURATION_MS = 1200;

/** Animate a number from 0 → target using requestAnimationFrame. */
function useCountUp(target: number, durationMs = COUNT_UP_DURATION_MS): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

const CONFIDENCE_STYLES: Record<
  PropertyConfidence,
  { label: string; classes: string }
> = {
  high: {
    label: "High confidence",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  medium: {
    label: "Medium confidence",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
  },
  low: {
    label: "Low confidence",
    classes: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

export function PropertyEstimatorResults({
  result,
  onGenerateQuote,
}: PropertyEstimatorResultsProps) {
  const e = result.estimates;
  const confidenceStyle = CONFIDENCE_STYLES[result.confidence];

  return (
    <div className="flex flex-col gap-4">
      {/* Address + confidence */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
          <p className="text-sm font-medium text-slate-900 leading-snug min-w-0">
            {result.address}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            confidenceStyle.classes
          )}
        >
          {confidenceStyle.label}
        </span>
      </div>

      {/* Satellite image */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 bob-fade-up">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.satelliteImageUrl}
          alt={`Satellite view of ${result.address}`}
          className="block w-full h-auto select-none"
          draggable={false}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <StatCard
          label="Lot size"
          value={e.lotSize}
          icon={<Home className="h-4 w-4" />}
          accent="from-slate-700 to-slate-900"
        />
        <StatCard
          label="Lawn area"
          value={e.lawnArea}
          icon={<Leaf className="h-4 w-4" />}
          accent="from-emerald-500 to-emerald-700"
        />
        <StatCard
          label="Driveway"
          value={e.drivewayArea}
          icon={<Car className="h-4 w-4" />}
          accent="from-slate-500 to-slate-700"
        />
        <StatCard
          label="Roof"
          value={e.roofArea}
          icon={<Layers className="h-4 w-4" />}
          accent="from-blue-500 to-blue-700"
        />
      </div>

      {result.notes && (
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-medium text-slate-700">Bob's notes: </span>
          {result.notes}
        </p>
      )}

      <button
        type="button"
        onClick={onGenerateQuote}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white",
          "bg-gradient-to-br from-blue-600 to-blue-800",
          "shadow-md shadow-blue-500/30",
          "transition-all duration-200",
          "hover:scale-[1.01] hover:shadow-blue-500/50",
          "active:scale-[0.99]"
        )}
      >
        <Sparkles className="h-4 w-4" />
        Generate quote from these measurements
      </button>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}

function StatCard({ label, value, icon, accent }: StatCardProps) {
  const animated = useCountUp(value);
  return (
    <div
      className={cn(
        "bob-fade-up rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-2",
        "transition-shadow duration-300 hover:shadow-md hover:shadow-slate-200/60"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md text-white shadow-sm",
            "bg-gradient-to-br",
            accent
          )}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <p className="text-xl font-bold tabular-nums text-slate-900 leading-tight">
          {animated.toLocaleString()}
        </p>
        <p className="text-xs font-medium text-slate-400">sq ft</p>
      </div>
    </div>
  );
}
