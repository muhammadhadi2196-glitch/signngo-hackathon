"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Quote,
  Search,
  FileText,
  Pencil,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowActions } from "@/components/ui/RowActions";

type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "CONVERTED";

interface QuoteRow {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  date: string | Date;
  validUntil: string | Date | null;
  total: string | number;
  customer: { id: string; name: string } | null;
}

interface Props {
  quotes: QuoteRow[];
  activeStatus?: string;
  query?: string;
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Converted", value: "CONVERTED" },
];

const STATUS_STYLES: Record<QuoteStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  VIEWED: "bg-cyan-100 text-cyan-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  EXPIRED: "bg-orange-100 text-orange-700",
  CONVERTED: "bg-purple-100 text-purple-700",
};

function fmt(n: unknown) {
  return Number(String(n)).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function QuotesList({ quotes: initial, activeStatus, query }: Props) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [quotes, setQuotes] = useState(initial);
  const [deleteTarget, setDeleteTarget] = useState<QuoteRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/quotes/${deleteTarget.id}`, { method: "DELETE" });
      success("Quote deleted");
      setQuotes((prev) => prev.filter((q) => q.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      showError(e.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  async function handleConvert(quoteId: string) {
    setConverting(quoteId);
    try {
      const res = await api<{ invoiceId: string }>(
        `/api/quotes/${quoteId}/convert`,
        { method: "POST" }
      );
      success("Quote converted to invoice!");
      router.push(`/invoices/${res.invoiceId}/edit`);
    } catch (e: any) {
      showError(e.message || "Conversion failed");
    } finally {
      setConverting(null);
    }
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/quotes?${f.value ? `status=${f.value}` : ""}${
                query ? `&q=${encodeURIComponent(query)}` : ""
              }`}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                (activeStatus || "") === f.value
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-400"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <form
          className="flex-1 flex items-center gap-2 max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            const q = (
              e.currentTarget.elements.namedItem("q") as HTMLInputElement
            ).value;
            router.push(
              `/quotes?${activeStatus ? `status=${activeStatus}&` : ""}${
                q ? `q=${encodeURIComponent(q)}` : ""
              }`
            );
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search quotes..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </form>
      </div>

      {quotes.length === 0 ? (
        <EmptyState
          icon={<Quote className="h-10 w-10" />}
          title="No quotes yet"
          description="Create your first quote to get started."
          action={{
            label: "+ New quote",
            onClick: () => router.push("/quotes/new"),
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Quote #</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Valid Until</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Total</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/quotes/${q.id}`)}
                  >
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {q.quoteNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {q.customer?.name || (
                        <span className="text-slate-400 italic">No customer</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{fmtDate(q.date)}</td>
                    <td className="py-3 px-4 text-slate-600">{fmtDate(q.validUntil)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_STYLES[q.status]
                        )}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                      {fmt(q.total)}
                    </td>
                    <td
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActions actions={[
                        { icon: <FileText className="h-3.5 w-3.5" />, label: "View", onClick: () => router.push(`/quotes/${q.id}`) },
                        { icon: <Pencil className="h-3.5 w-3.5" />, label: "Edit", onClick: () => router.push(`/quotes/${q.id}/edit`) },
                        { icon: <FileText className="h-3.5 w-3.5" />, label: "Download PDF", onClick: () => window.open(`/api/quotes/${q.id}/pdf`, "_blank") },
                        { icon: <ArrowRight className="h-3.5 w-3.5" />, label: "Convert to Invoice", hidden: q.status === "CONVERTED", onClick: () => handleConvert(q.id) },
                        { icon: <Trash2 className="h-3.5 w-3.5" />, label: "Delete", danger: true, separator: true, onClick: () => setDeleteTarget(q) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="p-4 hover:bg-slate-50 cursor-pointer"
                onClick={() => router.push(`/quotes/${q.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{q.quoteNumber}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {q.customer?.name || "No customer"} · {fmtDate(q.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-slate-900">
                      {fmt(q.total)}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1",
                        STATUS_STYLES[q.status]
                      )}
                    >
                      {q.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete quote?"
      >
        <p className="text-sm text-slate-600 mb-4">
          This will permanently delete{" "}
          <strong>{deleteTarget?.quoteNumber}</strong>. This action cannot be
          undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}

