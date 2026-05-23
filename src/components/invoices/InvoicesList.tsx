"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Receipt, Search, FileText, Pencil, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowActions } from "@/components/ui/RowActions";

type InvoiceStatus = "DRAFT" | "SENT" | "VIEWED" | "PAID" | "OVERDUE" | "VOID";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  date: string | Date;
  dueDate: string | Date | null;
  total: string | number;
  customer: { id: string; name: string } | null;
}

interface Props {
  invoices: InvoiceRow[];
  activeStatus?: string;
  query?: string;
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
];

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  VIEWED: "bg-cyan-100 text-cyan-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  VOID: "bg-slate-100 text-slate-400 line-through",
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

export function InvoicesList({ invoices: initial, activeStatus, query }: Props) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [invoices, setInvoices] = useState(initial);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const statusParam = activeStatus ? `&status=${activeStatus}` : "";

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/invoices/${deleteTarget.id}`, { method: "DELETE" });
      success("Invoice deleted");
      setInvoices((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      showError(e.message || "Failed to delete");
    } finally {
      setDeleting(false);
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
              href={`/invoices?${f.value ? `status=${f.value}` : ""}${
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
            const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value;
            router.push(
              `/invoices?${activeStatus ? `status=${activeStatus}&` : ""}${
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
              placeholder="Search invoices..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </form>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-10 w-10" />}
          title="No invoices yet"
          description="Create your first invoice to get started."
          action={{ label: "+ New invoice", onClick: () => router.push("/invoices/new") }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Invoice #</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Due</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Total</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {inv.customer?.name || <span className="text-slate-400 italic">No customer</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{fmtDate(inv.date)}</td>
                    <td className="py-3 px-4 text-slate-600">{fmtDate(inv.dueDate)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_STYLES[inv.status]
                        )}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                      {fmt(inv.total)}
                    </td>
                    <td
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActions actions={[
                        { icon: <FileText className="h-3.5 w-3.5" />, label: "View", onClick: () => router.push(`/invoices/${inv.id}`) },
                        { icon: <Pencil className="h-3.5 w-3.5" />, label: "Edit", onClick: () => router.push(`/invoices/${inv.id}/edit`) },
                        { icon: <Send className="h-3.5 w-3.5" />, label: "Download PDF", onClick: () => window.open(`/api/invoices/${inv.id}/pdf`, "_blank") },
                        { icon: <Trash2 className="h-3.5 w-3.5" />, label: "Delete", danger: true, separator: true, onClick: () => setDeleteTarget(inv) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="p-4 hover:bg-slate-50 cursor-pointer"
                onClick={() => router.push(`/invoices/${inv.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{inv.invoiceNumber}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {inv.customer?.name || "No customer"} · {fmtDate(inv.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-slate-900">{fmt(inv.total)}</p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1",
                        STATUS_STYLES[inv.status]
                      )}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete invoice?"
      >
        <p className="text-sm text-slate-600 mb-4">
          This will permanently delete{" "}
          <strong>{deleteTarget?.invoiceNumber}</strong>. This action cannot be
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

