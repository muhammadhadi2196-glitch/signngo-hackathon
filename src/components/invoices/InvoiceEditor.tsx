"use client";

import { useForm, FormProvider, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Send, Save } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { LineItemsTable, type ItemOption } from "./LineItemsTable";
import { NotesTabs } from "./NotesTabs";
import { TotalsPanel } from "./TotalsPanel";
import { SalespersonCombobox, type SalespersonOption } from "@/components/ui/SalespersonCombobox";

interface CustomerOption {
  id: string;
  name: string;
  email: string;
  billingAddress: string;
  shippingAddress: string;
}

interface BusinessProfile {
  displayName: string;
  businessName: string;
  address: string;
  logoPath: string | null;
}

interface InvoiceFormData {
  customerId: string;
  invoiceNumber: string;
  status: string;
  date: string;
  dueDate: string;
  paymentTerms: string;
  purchaseOrderNumber: string;
  salesperson: string;
  billingAddress: string;
  shippingAddress: string;
  publicNote: string;
  privateNote: string;
  footerNote: string;
  lineItems: {
    itemId: string | null;
    quantity: number;
    name: string;
    description: string;
    unitPrice: number;
    taxRate: number;
    sortOrder: number;
  }[];
}

interface Props {
  mode: "create" | "edit";
  invoiceId?: string;
  initialData: Partial<InvoiceFormData>;
  customers: CustomerOption[];
  items: ItemOption[];
  business: BusinessProfile;
  defaultTaxRate?: number;
  salespeople?: SalespersonOption[];
}

const PAYMENT_TERMS = [
  "Due on receipt",
  "Net 7",
  "Net 15",
  "Net 30",
  "Net 60",
];

export function InvoiceEditor({
  mode,
  invoiceId,
  initialData,
  customers,
  items,
  business,
  defaultTaxRate = 0,
  salespeople = [],
}: Props) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>(invoiceId);

  const methods = useForm<InvoiceFormData>({
    defaultValues: {
      customerId: "",
      invoiceNumber: "",
      status: "DRAFT",
      date: new Date().toISOString().split("T")[0],
      dueDate: "",
      paymentTerms: "Net 30",
      purchaseOrderNumber: "",
      salesperson: "",
      billingAddress: "",
      shippingAddress: "",
      publicNote: "",
      privateNote: "",
      footerNote: "",
      lineItems: [],
      ...initialData,
    },
  });

  const { register, handleSubmit, setValue, watch, control } = methods;

  const lineItems = useWatch({ control, name: "lineItems" }) || [];
  const publicNote = watch("publicNote");
  const privateNote = watch("privateNote");
  const footerNote = watch("footerNote");
  const selectedCustomerId = watch("customerId");
  const salesperson = watch("salesperson");

  // Compute totals client-side
  const { subtotal, taxTotal, total } = lineItems.reduce(
    (acc, li) => {
      const qty = Number(li?.quantity) || 0;
      const price = Number(li?.unitPrice) || 0;
      const rate = Number(li?.taxRate) || 0;
      const sub = parseFloat((qty * price).toFixed(2));
      const tax = parseFloat((sub * rate / 100).toFixed(2));
      return {
        subtotal: parseFloat((acc.subtotal + sub).toFixed(2)),
        taxTotal: parseFloat((acc.taxTotal + tax).toFixed(2)),
        total: parseFloat((acc.total + sub + tax).toFixed(2)),
      };
    },
    { subtotal: 0, taxTotal: 0, total: 0 }
  );

  // Auto-fill addresses when customer changes
  useEffect(() => {
    if (!selectedCustomerId) return;
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) return;
    if (customer.billingAddress) setValue("billingAddress", customer.billingAddress);
    if (customer.shippingAddress) setValue("shippingAddress", customer.shippingAddress);
  }, [selectedCustomerId, customers, setValue]);

  async function saveInvoice(data: InvoiceFormData): Promise<string> {
    const payload = {
      ...data,
      customerId: data.customerId || null,
      dueDate: data.dueDate || null,
    };

    if (mode === "edit" && savedId) {
      const res = await api<{ invoice: { id: string } }>(
        `/api/invoices/${savedId}`,
        { method: "PUT", body: JSON.stringify(payload) }
      );
      return res.invoice.id;
    } else {
      const res = await api<{ invoice: { id: string } }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res.invoice.id;
    }
  }

  const onSave = handleSubmit(async (data) => {
    setSaving(true);
    try {
      const id = await saveInvoice(data);
      setSavedId(id);
      success("Invoice saved");
      router.push(`/invoices/${id}`);
    } catch (e: any) {
      showError(e.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  });

  const onSaveAndSend = handleSubmit(async (data) => {
    setSaving(true);
    try {
      const id = await saveInvoice(data);
      setSavedId(id);
      success("Invoice saved");
      setShowSend(true);
    } catch (e: any) {
      showError(e.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  });

  const bizName = business.displayName || business.businessName || "Your business";

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-slate-50">
        {/* Top bar */}
        <div className="sticky top-14 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/invoices"
              className="text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-base font-semibold text-slate-900">
              {mode === "edit" ? "Edit invoice" : "New invoice"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {savedId && (
              <a
                href={`/api/invoices/${savedId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-md px-3 h-9"
              >
                <FileText className="h-3.5 w-3.5" />
                Preview PDF
              </a>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onSave}
              loading={saving}
              type="button"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={onSaveAndSend}
              loading={saving}
              type="button"
            >
              <Send className="h-3.5 w-3.5" />
              Save &amp; Send
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {/* Main card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            {/* Business header + meta */}
            <div className="flex flex-col md:flex-row gap-6 justify-between">
              {/* Business info (read-only display) */}
              <div className="text-sm text-slate-600 space-y-0.5">
                <p className="font-semibold text-slate-900">{bizName}</p>
                {business.address && <p>{business.address}</p>}
              </div>

              {/* Meta fields */}
              <div className="w-full md:w-72 space-y-3">
                <Field label="Date">
                  <input
                    type="date"
                    {...register("date")}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </Field>
                <Field label="Invoice Number">
                  <input
                    {...register("invoiceNumber")}
                    placeholder="Auto-generated"
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </Field>
                <Field label="Payment Terms">
                  <select
                    {...register("paymentTerms")}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    {PAYMENT_TERMS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Due Date">
                  <input
                    type="date"
                    {...register("dueDate")}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </Field>
                <Field label="Purchase Order #">
                  <input
                    {...register("purchaseOrderNumber")}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </Field>
                <Field label="Salesperson">
                  <SalespersonCombobox
                    value={salesperson}
                    onChange={(v) => setValue("salesperson", v)}
                    salespeople={salespeople}
                  />
                </Field>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Customer + Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Customer">
                <select
                  {...register("customerId")}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="">— No customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Link
                  href="/customers/new"
                  className="text-xs text-blue-600 hover:text-blue-800 mt-0.5"
                  target="_blank"
                >
                  + Create new customer
                </Link>
              </Field>
              <Field label="Billing Address">
                <textarea
                  {...register("billingAddress")}
                  rows={3}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </Field>
              <Field label="Shipping Address">
                <textarea
                  {...register("shippingAddress")}
                  rows={3}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </Field>
            </div>

            <hr className="border-slate-100" />

            {/* Line items */}
            <LineItemsTable items={items} defaultTaxRate={defaultTaxRate} />

            <hr className="border-slate-100" />

            {/* Notes + Totals */}
            <div className="flex flex-col md:flex-row gap-6 md:items-start">
              <div className="flex-1">
                <NotesTabs
                  publicNote={publicNote}
                  privateNote={privateNote}
                  footerNote={footerNote}
                  onChangePublic={(v) => setValue("publicNote", v)}
                  onChangePrivate={(v) => setValue("privateNote", v)}
                  onChangeFooter={(v) => setValue("footerNote", v)}
                />
              </div>
              <div className="w-full md:w-64 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <TotalsPanel
                  subtotal={subtotal}
                  taxTotal={taxTotal}
                  total={total}
                  balance={total}
                />
              </div>
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="flex justify-end gap-2 pb-6">
            <Button
              variant="secondary"
              onClick={onSave}
              loading={saving}
              type="button"
            >
              Save draft
            </Button>
            <Button
              variant="accent"
              onClick={onSaveAndSend}
              loading={saving}
              type="button"
            >
              <Send className="h-4 w-4" />
              Save &amp; Send
            </Button>
          </div>
        </div>
      </div>

      {/* Send modal */}
      {showSend && savedId && (
        <SendInvoiceModal
          invoiceId={savedId}
          defaultEmail={
            customers.find((c) => c.id === watch("customerId"))?.email || ""
          }
          invoiceNumber={watch("invoiceNumber")}
          bizName={bizName}
          onClose={() => setShowSend(false)}
          onSent={() => {
            setShowSend(false);
            router.push(`/invoices/${savedId}`);
          }}
        />
      )}
    </FormProvider>
  );
}

// ─── Send Modal ────────────────────────────────────────────────────────────────

interface SendModalProps {
  invoiceId: string;
  defaultEmail: string;
  invoiceNumber: string;
  bizName: string;
  onClose: () => void;
  onSent: () => void;
}

function SendInvoiceModal({
  invoiceId,
  defaultEmail,
  invoiceNumber,
  bizName,
  onClose,
  onSent,
}: SendModalProps) {
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      await api(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
        body: JSON.stringify({ email: email || undefined, message: message || undefined }),
      });
      success("Invoice sent!");
      onSent();
    } catch (e: any) {
      showError(e.message || "Failed to send invoice");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Send Invoice {invoiceNumber}
        </h2>
        <Field label="Recipient Email" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="customer@example.com"
          />
        </Field>
        <Field label="Subject">
          <input
            readOnly
            value={`Invoice ${invoiceNumber} from ${bizName}`}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-slate-50 text-slate-500"
          />
        </Field>
        <Field label="Message (optional)">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="Add a personal message..."
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">
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
            Send invoice
          </Button>
        </div>
      </div>
    </div>
  );
}
