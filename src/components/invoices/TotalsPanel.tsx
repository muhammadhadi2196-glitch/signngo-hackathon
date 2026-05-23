"use client";

import { cn } from "@/lib/cn";

interface Props {
  subtotal: number;
  taxTotal: number;
  total: number;
  balance?: number;
  taxLabel?: string;
  className?: string;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function TotalsPanel({
  subtotal,
  taxTotal,
  total,
  balance,
  taxLabel = "Tax",
  className,
}: Props) {
  return (
    <div className={cn("w-full", className)}>
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span className="font-mono">{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>{taxLabel}</span>
          <span className="font-mono">{fmt(taxTotal)}</span>
        </div>
        <div className="border-t border-slate-200 pt-2 flex justify-between font-semibold text-slate-900">
          <span>Total</span>
          <span className="font-mono text-lg tabular-nums">{fmt(total)}</span>
        </div>
        {balance !== undefined && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>Balance Due</span>
            <span className="font-mono">{fmt(balance)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
