"use client";

import { Pencil, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AIQuoteDraft } from "@/lib/bob/types";

interface QuoteGeneratorPreviewProps {
  draft: AIQuoteDraft;
  onEditAndSend: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function QuoteGeneratorPreview({
  draft,
  onEditAndSend,
  onRegenerate,
  regenerating,
}: QuoteGeneratorPreviewProps) {
  const subtotal = draft.lineItems.reduce(
    (acc, li) => acc + li.quantity * li.unitPrice,
    0
  );
  const tax = draft.lineItems.reduce(
    (acc, li) =>
      acc + (li.quantity * li.unitPrice * (li.taxRate || 0)) / 100,
    0
  );
  const total = subtotal + tax;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-500/20">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Quote Draft
          </p>
          <h2 className="mt-0.5 text-lg font-semibold text-slate-900 leading-snug">
            {draft.title || "Untitled quote"}
          </h2>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Item</th>
              <th className="text-right font-medium px-4 py-2.5 w-16">Qty</th>
              <th className="text-right font-medium px-4 py-2.5 w-24">Rate</th>
              <th className="text-right font-medium px-4 py-2.5 w-24">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {draft.lineItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No line items.
                </td>
              </tr>
            ) : (
              draft.lineItems.map((li, i) => (
                <tr key={i} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{li.name}</p>
                    {li.description && (
                      <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                        {li.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                    {li.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                    {formatCurrency(li.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 tabular-nums">
                    {formatCurrency(li.quantity * li.unitPrice)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-50 text-sm">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-slate-500">
                Subtotal
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                {formatCurrency(subtotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-slate-500">
                Tax
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                {formatCurrency(tax)}
              </td>
            </tr>
            <tr>
              <td
                colSpan={3}
                className="px-4 py-2.5 text-right font-semibold text-slate-900"
              >
                Total
              </td>
              <td className="px-4 py-2.5 text-right text-base font-bold text-slate-900 tabular-nums">
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {draft.scopeOfWork && (
          <PreviewBlock label="Scope of work" value={draft.scopeOfWork} />
        )}
        {draft.exclusions && (
          <PreviewBlock label="Exclusions" value={draft.exclusions} />
        )}
        {draft.paymentTerms && (
          <PreviewBlock label="Payment terms" value={draft.paymentTerms} />
        )}
        {draft.notes && <PreviewBlock label="Notes" value={draft.notes} />}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700",
            "transition-all duration-200",
            "hover:border-slate-300 hover:bg-slate-50",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <RefreshCw
            className={cn("h-4 w-4", regenerating && "animate-spin")}
          />
          {regenerating ? "Generating…" : "Different version"}
        </button>
        <button
          type="button"
          onClick={onEditAndSend}
          disabled={regenerating}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white",
            "bg-gradient-to-br from-blue-600 to-blue-800",
            "shadow-md shadow-blue-500/30",
            "transition-all duration-200",
            "hover:scale-[1.02] hover:shadow-blue-500/50",
            "active:scale-[0.99]",
            "disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          )}
        >
          <Pencil className="h-4 w-4" />
          Edit &amp; Send
        </button>
      </div>
    </div>
  );
}

function PreviewBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
        {value}
      </p>
    </div>
  );
}
