"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Pill, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { Pencil, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import type { Customer } from "@prisma/client";

interface SerializedInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  date: Date | string;
  total: number;
}

interface SerializedQuote {
  id: string;
  quoteNumber: string;
  status: string;
  date: Date | string;
  total: number;
}

interface CustomerDetailProps {
  customer: Customer & {
    invoices: SerializedInvoice[];
    quotes: SerializedQuote[];
  };
}

function statusToVariant(status: string) {
  const map: Record<string, "draft" | "sent" | "viewed" | "completed" | "overdue"> = {
    DRAFT: "draft",
    SENT: "sent",
    VIEWED: "viewed",
    PAID: "completed",
    ACCEPTED: "completed",
    OVERDUE: "overdue",
    EXPIRED: "overdue",
  };
  return map[status] ?? "draft";
}

export function CustomerDetail({ customer }: CustomerDetailProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api(`/api/customers/${customer.id}`, { method: "DELETE" });
      success("Customer deleted");
      router.push("/customers");
      router.refresh();
    } catch (e: any) {
      showError(e.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {customer.name}
          </h1>
          {customer.email && (
            <p className="text-sm text-slate-500 mt-0.5">{customer.email}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/customers/${customer.id}/edit`}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Contact info card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Contact details
        </h2>
        {customer.email && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
            <a href={`mailto:${customer.email}`} className="hover:text-blue-700">
              {customer.email}
            </a>
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
            <a href={`tel:${customer.phone}`} className="hover:text-blue-700">
              {customer.phone}
            </a>
          </div>
        )}
        {customer.billingAddress && (
          <div className="flex items-start gap-2 text-sm text-slate-700">
            <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <pre className="font-sans whitespace-pre-wrap">
              {customer.billingAddress}
            </pre>
          </div>
        )}
        {customer.notes && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-1">Notes</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {customer.notes}
            </p>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Invoices</h2>
          <Link
            href={`/invoices/new?customerId=${customer.id}`}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            + New invoice
          </Link>
        </div>
        {customer.invoices.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No invoices yet</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {customer.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium text-slate-900 hover:text-blue-700"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {format(new Date(inv.date), "MMM d, yyyy")}
                  </td>
                  <td className="px-5 py-3">
                    <Pill variant={statusToVariant(inv.status)} />
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">
                    ${inv.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quotes */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Quotes</h2>
          <Link
            href={`/quotes/new?customerId=${customer.id}`}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            + New quote
          </Link>
        </div>
        {customer.quotes.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No quotes yet</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {customer.quotes.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/quotes/${q.id}`}
                      className="font-medium text-slate-900 hover:text-blue-700"
                    >
                      {q.quoteNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {format(new Date(q.date), "MMM d, yyyy")}
                  </td>
                  <td className="px-5 py-3">
                    <Pill variant={statusToVariant(q.status)} />
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">
                    ${q.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete modal */}
      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete customer"
        size="sm"
      >
        <p className="text-sm text-slate-600 mb-5">
          Are you sure you want to delete{" "}
          <span className="font-medium text-slate-900">{customer.name}</span>?
          Existing invoices and quotes will not be deleted.
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={() => setShowDelete(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            className="flex-1"
            loading={deleting}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
