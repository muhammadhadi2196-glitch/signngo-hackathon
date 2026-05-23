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
import { LineItemsTable, type ItemOption } from "@/components/invoices/LineItemsTable";
import { NotesTabs } from "@/components/invoices/NotesTabs";
import { TotalsPanel } from "@/components/invoices/TotalsPanel";
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

interface QuoteFormData {
  customerId: string;
  quoteNumber: string;
  status: string;
  date: string;
  validUntil: string;
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
  quoteId?: string;
  initialData: Partial<QuoteFormData>;
  customers: CustomerOption[];
  items: ItemOption[];
  business: BusinessProfile;
  defaultTaxRate?: number;
  salespeople?: SalespersonOption[];
}

export function QuoteEditor({
  mode,
  quoteId,
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
  const [savedId, setSavedId] = useState<string | undefined>(quoteId);

  const methods = useForm<QuoteFormData>({
    defaultValues: {
      customerId: "",
      quoteNumber: "",
      status: "DRAFT",
      date: new Date().toISOString().split("T")[0],
      validUntil: "",
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

  useEffect(() => {
    if (!selectedCustomerId) return;
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) return;
    if (customer.billingAddress) setValue("billingAddress", customer.billingAddress);
    if (customer.shippingAddress) setValue("shippingAddress", customer.shippingAddress);
  }, [selectedCustomerId, customers, setValue]);

  async function saveQuote(data: QuoteFormData): Promise<string> {
    const payload = {
      ...data,
      customerId: data.customerId || null,
      validUntil: data.validUntil || null,
    };

    if (mode === "edit" && savedId) {
      const res = await api<{ quote: { id: string } }>(
        `/api/quotes/${savedId}`,
        { method: "PUT", body: JSON.stringify(payload) }
      );
      return res.quote.id;
    } else {
      const res = await api<{ quote: { id: string } }>("/api/quotes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res.quote.id;
    }
  }

  const onSave = handleSubmit(async (data) => {
    setSaving(true);
    try {
      const id = await saveQuote(data);
      setSavedId(id);
      success("Quote saved");
      router.push(`/quotes/${id}`);
    } catch (e: any) {
      showError(e.message || "Failed to save quote");
    } finally {
      setSaving(false);
    }
  });

  const onSaveAndSend = handleSubmit(async (data) => {
    setSaving(true);
    try {
      const id = await saveQuote(data);
      setSavedId(id);
      success("Quote saved");
      setShowSend(true);
    } catch (e: any) {
      showError(e.message || "Failed to save quote");
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
              href="/quotes"
              className="text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-base font-semibold text-slate-900">
              {mode === "edit" ? "Edit quote" : "New quote"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {savedId && (
              <a
                href={`/api/quotes/${savedId}/pdf`}
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
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            {/* Business header + meta */}
            <div className="flex flex-col md:flex-row gap-6 justify-between">
              <div className="text-sm text-slate-600 space-y-0.5">
                <p className="font-semibold text-slate-900">{bizName}</p>
                {business.address && <p>{business.address}</p>}
              </div>

              <div className="w-full md:w-72 space-y-3">
                <Field label="Date">
                  <input
                    type="date"
                    {...register("date")}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </Field>
                <Field label="Quote Number">
                  <input
                    {...register("quoteNumber")}
                    placeholder="Auto-generated"
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </Field>
                <Field label="Valid Until">
                  <input
                    type="date"
                    {...register("validUntil")}
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
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pb-6">
            <Button variant="secondary" onClick={onSave} loading={saving} type="button">
              Save draft
            </Button>
            <Button variant="accent" onClick={onSaveAndSend} loading={saving} type="button">
              <Send className="h-4 w-4" />
              Save &amp; Send
            </Button>
          </div>
        </div>
      </div>

      {showSend && savedId && (
        <SendQuoteModal
          quoteId={savedId}
          defaultEmail={
            customers.find((c) => c.id === watch("customerId"))?.email || ""
          }
          quoteNumber={watch("quoteNumber")}
          bizName={bizName}
          onClose={() => setShowSend(false)}
          onSent={() => {
            setShowSend(false);
            router.push(`/quotes/${savedId}`);
          }}
        />
      )}
    </FormProvider>
  );
}

interface SendModalProps {
  quoteId: string;
  defaultEmail: string;
  quoteNumber: string;
  bizName: string;
  onClose: () => void;
  onSent: () => void;
}

function SendQuoteModal({
  quoteId,
  defaultEmail,
  quoteNumber,
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
      await api(`/api/quotes/${quoteId}/send`, {
        method: "POST",
        body: JSON.stringify({ email: email || undefined, message: message || undefined }),
      });
      success("Quote sent!");
      onSent();
    } catch (e: any) {
      showError(e.message || "Failed to send quote");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Send Quote {quoteNumber}
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
        <Field label="Message (optional)">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
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
            Send quote
          </Button>
        </div>
      </div>
    </div>
  );
}
