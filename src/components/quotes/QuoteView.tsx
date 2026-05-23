"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Send, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "CONVERTED";

interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  taxRate: string | number;
  lineTotal: string | number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  date: Date | string;
  validUntil: Date | string | null;
  salesperson: string;
  billingAddress: string;
  shippingAddress: string;
  publicNote: string;
  footerNote: string;
  subtotal: string | number;
  taxTotal: string | number;
  total: string | number;
  lineItems: LineItem[];
  customer: { id: string; name: string; email: string } | null;
  convertedToInvoiceId: string | null;
}

interface Props {
  quote: Quote;
  business: {
    displayName: string;
    businessName: string;
    address: string;
    taxNumber: string;
    defaultFooter: string;
  };
}

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

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const CHANGEABLE_STATUSES: QuoteStatus[] = [
  "DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED",
];

export function QuoteView({ quote, business }: Props) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [showSend, setShowSend] = useState(false);
  const [email, setEmail] = useState(quote.customer?.email || "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<QuoteStatus>(quote.status);
  const [changingStatus, setChangingStatus] = useState(false);

  const canConvert = currentStatus !== "CONVERTED";

  async function handleStatusChange(newStatus: QuoteStatus) {
    if (newStatus === currentStatus) return;
    setChangingStatus(true);
    try {
      await api(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setCurrentStatus(newStatus);
      success(`Status set to ${newStatus}`);
    } catch (e: any) {
      showError(e.message || "Status update failed");
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      const data = await api<{ ok: boolean; emailSent: boolean }>(
        `/api/quotes/${quote.id}/send`,
        { method: "POST", body: JSON.stringify({ email: email || undefined, message: message || undefined }) }
      );
      setShowSend(false);
      router.refresh();
      if (data.emailSent === false) {
        showError("Quote marked sent, but email delivery failed. Download the PDF and send manually.");
      } else {
        success("Quote sent!");
      }
    } catch (e: any) {
      showError(e.message || "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function handleConvert() {
    setConverting(true);
    try {
      const res = await api<{ invoiceId: string }>(
        `/api/quotes/${quote.id}/convert`,
        { method: "POST" }
      );
      success("Converted to invoice!");
      router.push(`/invoices/${res.invoiceId}/edit`);
    } catch (e: any) {
      showError(e.message || "Conversion failed");
    } finally {
      setConverting(false);
    }
  }

  const bizName = business.displayName || business.businessName;

  return (
    <>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
            STATUS_STYLES[currentStatus]
          )}
        >
          {currentStatus}
        </span>
        {currentStatus !== "CONVERTED" && (
          <select
            value={currentStatus}
            disabled={changingStatus}
            onChange={(e) => handleStatusChange(e.target.value as QuoteStatus)}
            className="text-xs border border-slate-300 rounded-md px-2 py-1 text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
          >
            {CHANGEABLE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <Button variant="accent" size="sm" onClick={() => setShowSend(true)} type="button">
          <Send className="h-3.5 w-3.5" />
          Send
        </Button>
        {canConvert && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleConvert}
            loading={converting}
            type="button"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Convert to Invoice
          </Button>
        )}
        {quote.convertedToInvoiceId && (
          <a
            href={`/invoices/${quote.convertedToInvoiceId}`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View invoice →
          </a>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-10 space-y-6 max-w-4xl">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Quote</h2>
            <p className="text-slate-600 mt-1 font-medium">{bizName}</p>
            {business.address && (
              <p className="text-slate-500 text-sm">{business.address}</p>
            )}
          </div>
          <div className="text-sm space-y-1.5">
            <Row label="Date" value={fmtDate(quote.date)} />
            <Row label="Quote No." value={quote.quoteNumber} />
            {quote.validUntil && (
              <Row label="Valid Until" value={fmtDate(quote.validUntil)} />
            )}
            {quote.salesperson && (
              <Row label="Salesperson" value={quote.salesperson} />
            )}
          </div>
        </div>

        <hr className="border-slate-100" />

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-semibold text-slate-500 uppercase text-xs tracking-wide mb-1">Bill To</p>
            <p className="font-medium">{quote.customer?.name || "—"}</p>
            {quote.billingAddress && (
              <p className="text-slate-500 whitespace-pre-line">{quote.billingAddress}</p>
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-500 uppercase text-xs tracking-wide mb-1">Ship To</p>
            <p className="text-slate-600 whitespace-pre-line">
              {quote.shippingAddress || quote.billingAddress || "—"}
            </p>
          </div>
        </div>

        <hr className="border-slate-100" />

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
              {quote.lineItems.map((li) => (
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

        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono">{fmt(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{business.taxNumber ? "GST" : "Tax"}</span>
              <span className="font-mono">{fmt(quote.taxTotal)}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 pt-2">
              <span>Total</span>
              <span className="font-mono text-lg">{fmt(quote.total)}</span>
            </div>
          </div>
        </div>

        {quote.publicNote && (
          <div className="text-sm text-slate-600 pt-2">
            <p>{quote.publicNote}</p>
          </div>
        )}
        {business.taxNumber && (
          <p className="text-sm text-slate-500">GST No: {business.taxNumber}</p>
        )}
        {(quote.footerNote || business.defaultFooter) && (
          <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-4">
            {quote.footerNote || business.defaultFooter}
          </p>
        )}
      </div>

      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Send Quote {quote.quoteNumber}
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
              <Button
                variant="secondary"
                onClick={() => setShowSend(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                onClick={handleSend}
                loading={sending}
                disabled={!email}
                type="button"
              >
                <Send className="h-4 w-4" />
                Send quote
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
