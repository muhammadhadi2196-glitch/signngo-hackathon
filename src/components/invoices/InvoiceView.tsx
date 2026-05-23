"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Send } from "lucide-react";
import { cn } from "@/lib/cn";

type InvoiceStatus = "DRAFT" | "SENT" | "VIEWED" | "PAID" | "OVERDUE" | "VOID";

interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  taxRate: string | number;
  lineTotal: string | number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  date: Date | string;
  dueDate: Date | string | null;
  paymentTerms: string;
  purchaseOrderNumber: string;
  salesperson: string;
  billingAddress: string;
  shippingAddress: string;
  publicNote: string;
  footerNote: string;
  subtotal: string | number;
  taxTotal: string | number;
  total: string | number;
  balance: string | number;
  lineItems: LineItem[];
  customer: { id: string; name: string; email: string } | null;
}

interface Props {
  invoice: Invoice;
  business: {
    displayName: string;
    businessName: string;
    address: string;
    taxNumber: string;
    defaultFooter: string;
  };
}

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  VIEWED: "bg-cyan-100 text-cyan-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  VOID: "bg-slate-100 text-slate-400",
};

function fmt(n: unknown) {
  return Number(String(n)).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function InvoiceView({ invoice, business }: Props) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [showSend, setShowSend] = useState(false);
  const [email, setEmail] = useState(invoice.customer?.email || "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      const data = await api<{ ok: boolean; emailSent: boolean }>(
        `/api/invoices/${invoice.id}/send`,
        { method: "POST", body: JSON.stringify({ email: email || undefined, message: message || undefined }) }
      );
      setShowSend(false);
      router.refresh();
      if (data.emailSent === false) {
        showError("Invoice marked sent, but email delivery failed. Download the PDF and send manually.");
      } else {
        success("Invoice sent!");
      }
    } catch (e: any) {
      showError(e.message || "Send failed");
    } finally {
      setSending(false);
    }
  }

  const bizName = business.displayName || business.businessName;

  return (
    <>
      {/* Send button in sub-header */}
      <div className="flex items-center gap-2 mb-6">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
            STATUS_STYLES[invoice.status]
          )}
        >
          {invoice.status}
        </span>
        <Button
          variant="accent"
          size="sm"
          onClick={() => setShowSend(true)}
          type="button"
        >
          <Send className="h-3.5 w-3.5" />
          Send
        </Button>
      </div>

      {/* Invoice card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-10 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Invoice</h2>
            <p className="text-slate-600 mt-1 font-medium">{bizName}</p>
            {business.address && <p className="text-slate-500 text-sm">{business.address}</p>}
          </div>
          <div className="text-sm space-y-1.5">
            <Row label="Date" value={fmtDate(invoice.date)} />
            <Row label="Invoice No." value={invoice.invoiceNumber} />
            {invoice.dueDate && <Row label="Due Date" value={fmtDate(invoice.dueDate)} />}
            {invoice.purchaseOrderNumber && <Row label="PO #" value={invoice.purchaseOrderNumber} />}
            {invoice.salesperson && <Row label="Salesperson" value={invoice.salesperson} />}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Addresses */}
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-semibold text-slate-500 uppercase text-xs tracking-wide mb-1">Bill To</p>
            <p className="font-medium">{invoice.customer?.name || "—"}</p>
            {invoice.billingAddress && <p className="text-slate-500 whitespace-pre-line">{invoice.billingAddress}</p>}
          </div>
          <div>
            <p className="font-semibold text-slate-500 uppercase text-xs tracking-wide mb-1">Ship To</p>
            <p className="text-slate-600 whitespace-pre-line">{invoice.shippingAddress || invoice.billingAddress || "—"}</p>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Line items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-4 font-medium">Qty</th>
                <th className="text-left py-2 pr-4 font-medium w-full">Description</th>
                <th className="text-right py-2 pr-4 font-medium">Unit Price</th>
                <th className="text-right py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoice.lineItems.map((li) => (
                <tr key={li.id}>
                  <td className="py-3 pr-4 text-slate-600">{String(li.quantity)}</td>
                  <td className="py-3 pr-4">
                    {li.name && <p className="font-medium text-slate-900">{li.name}</p>}
                    {li.description && <p className="text-slate-500">{li.description}</p>}
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-600 font-mono">{fmt(li.unitPrice)}</td>
                  <td className="py-3 text-right font-mono font-medium text-slate-900">{fmt(li.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono">{fmt(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{business.taxNumber ? "GST" : "Tax"}</span>
              <span className="font-mono">{fmt(invoice.taxTotal)}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 pt-2">
              <span>Total</span>
              <span className="font-mono text-lg">{fmt(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Balance Due</span>
              <span className="font-mono">{fmt(invoice.balance)}</span>
            </div>
          </div>
        </div>

        {invoice.publicNote && (
          <div className="text-sm text-slate-600 pt-2">
            <p>{invoice.publicNote}</p>
          </div>
        )}
        {business.taxNumber && (
          <p className="text-sm text-slate-500">GST No: {business.taxNumber}</p>
        )}
        {(invoice.footerNote || business.defaultFooter) && (
          <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-4">
            {invoice.footerNote || business.defaultFooter}
          </p>
        )}
      </div>

      {/* Send modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Send Invoice {invoice.invoiceNumber}
            </h2>
            <Field label="Recipient Email" required>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </Field>
            <Field label="Message (optional)">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowSend(false)} type="button">
                Cancel
              </Button>
              <Button variant="accent" onClick={handleSend} loading={sending} disabled={!email} type="button">
                <Send className="h-4 w-4" />
                Send invoice
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 justify-between">
      <span className="text-slate-500 font-medium">{label}:</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}
