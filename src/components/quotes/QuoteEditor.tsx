"use client";

import { useForm, FormProvider, useWatch } from "react-hook-form";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, FileText, Send, Save, Ruler, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import {
  LineItemsTable,
  type ItemOption,
  type Dimension,
} from "@/components/invoices/LineItemsTable";
import { NotesTabs } from "@/components/invoices/NotesTabs";
import { TotalsPanel } from "@/components/invoices/TotalsPanel";
import { SalespersonCombobox, type SalespersonOption } from "@/components/ui/SalespersonCombobox";
import {
  BOB_EVENTS,
  PENDING_DIMENSIONS_KEY,
  type AIQuoteDraft,
  type DimensionSavedDetail,
} from "@/lib/bob/types";

const MapDimensionModal = dynamic(
  () =>
    import("./MapDimensionModal").then((m) => ({
      default: m.MapDimensionModal,
    })),
  { ssr: false }
);

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>(quoteId);
  const aiHandledRef = useRef(false);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [showMapModal, setShowMapModal] = useState(false);

  function handleSaveDimension(title: string, sqft: number) {
    setDimensions((prev) => [...prev, { id: nanoid(), title, sqft }]);
    setShowMapModal(false);
  }

  function handleRemoveDimension(id: string) {
    setDimensions((prev) => prev.filter((d) => d.id !== id));
  }

  // ─── Bob's chat-measured dimensions ──────────────────────────────────
  // The layout-mounted MapDimensionModal (opened from Bob's chat) saves
  // via two channels: a sessionStorage queue (for cases where no
  // QuoteEditor is mounted yet) and a `bob:dimension_saved` event (for
  // the case where one is). On mount we drain the queue; while mounted
  // we also listen for the live event.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(PENDING_DIMENSIONS_KEY);
      if (raw) {
        const queue = JSON.parse(raw) as DimensionSavedDetail[];
        if (Array.isArray(queue) && queue.length > 0) {
          setDimensions((prev) => [
            ...prev,
            ...queue.map((d) => ({
              id: nanoid(),
              title: d.title,
              sqft: d.sqft,
            })),
          ]);
          window.sessionStorage.removeItem(PENDING_DIMENSIONS_KEY);
          success(
            queue.length === 1
              ? `Added Bob's measured dimension: ${queue[0].title}`
              : `Added ${queue.length} measured dimensions from Bob`
          );
        }
      }
    } catch {
      // Corrupt queue — ignore.
    }
  }, [success]);

  useEffect(() => {
    function onDimensionSaved(e: Event) {
      const detail = (e as CustomEvent<DimensionSavedDetail>).detail;
      if (!detail) return;
      setDimensions((prev) => [
        ...prev,
        { id: nanoid(), title: detail.title, sqft: detail.sqft },
      ]);
      // The toast is already shown by the layout-level save handler;
      // skipping here to avoid double-firing.
    }
    window.addEventListener(BOB_EVENTS.dimensionSaved, onDimensionSaved);
    return () =>
      window.removeEventListener(
        BOB_EVENTS.dimensionSaved,
        onDimensionSaved
      );
  }, []);

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

  const { register, handleSubmit, setValue, watch, control, getValues } = methods;

  // ─── AI draft pre-fill ───────────────────────────────────────────────
  // If the URL carries `?aiDraft=<id>`, hydrate the form from sessionStorage.
  // If the URL carries `?ai=1`, open the AI Quote Generator modal.
  // Both flags are consumed once, then stripped from the URL.
  useEffect(() => {
    if (mode !== "create") return;
    if (aiHandledRef.current) return;
    if (!searchParams) return;

    const aiDraftId = searchParams.get("aiDraft");
    const wantsModal = searchParams.get("ai") === "1";

    if (aiDraftId) {
      try {
        const raw = window.sessionStorage.getItem(`bob_ai_draft_${aiDraftId}`);
        if (raw) {
          const draft = JSON.parse(raw) as AIQuoteDraft;
          applyAIDraftToForm(draft, getValues, setValue);
          window.sessionStorage.removeItem(`bob_ai_draft_${aiDraftId}`);
          success("Bob's draft loaded — review and send when you're ready");
        }
      } catch {
        // Corrupt or missing draft — silently fall through.
      }
      aiHandledRef.current = true;
      router.replace(pathname);
      return;
    }

    if (wantsModal) {
      window.dispatchEvent(
        new CustomEvent(BOB_EVENTS.openQuoteGenerator, { detail: {} })
      );
      aiHandledRef.current = true;
      router.replace(pathname);
    }
  }, [mode, searchParams, pathname, router, getValues, setValue, success]);

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

            {/* Dimensions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Dimensions
                  </p>
                  <p className="text-xs text-slate-500">
                    Measure property areas on a satellite map to reuse as line
                    item quantities.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setShowMapModal(true)}
                >
                  <Ruler className="h-3.5 w-3.5" />
                  Add Dimension
                </Button>
              </div>

              {dimensions.length > 0 && (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                  {dimensions.map((dim) => (
                    <li
                      key={dim.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {dim.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {dim.sqft.toLocaleString()} sq ft
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDimension(dim.id)}
                        className="text-slate-400 transition-colors hover:text-red-500"
                        aria-label={`Remove ${dim.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Line items */}
            <LineItemsTable
              items={items}
              defaultTaxRate={defaultTaxRate}
              dimensions={dimensions}
            />

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
                  polishContext="quote_notes"
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

      {showMapModal && (
        <MapDimensionModal
          onClose={() => setShowMapModal(false)}
          onSave={handleSaveDimension}
        />
      )}

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

// Map an AI-generated quote draft onto the form fields. The form has no
// dedicated "title" or "payment terms" fields, so we fold those into the
// existing publicNote and footerNote respectively.
function applyAIDraftToForm(
  draft: AIQuoteDraft,
  getValues: () => QuoteFormData,
  setValue: (name: keyof QuoteFormData, value: any) => void
) {
  const publicNoteParts: string[] = [];
  if (draft.title) publicNoteParts.push(draft.title);
  if (draft.scopeOfWork)
    publicNoteParts.push(`Scope of work\n${draft.scopeOfWork}`);
  if (draft.exclusions)
    publicNoteParts.push(`Exclusions\n${draft.exclusions}`);

  if (publicNoteParts.length > 0) {
    setValue("publicNote", publicNoteParts.join("\n\n"));
  }
  if (draft.paymentTerms) setValue("footerNote", draft.paymentTerms);
  if (draft.notes) setValue("privateNote", draft.notes);

  if (Array.isArray(draft.lineItems) && draft.lineItems.length > 0) {
    const existingCount = getValues().lineItems.length;
    const mapped = draft.lineItems.map((li, i) => ({
      itemId: null,
      quantity: Number(li.quantity) || 1,
      name: li.name || "",
      description: li.description || "",
      unitPrice: Number(li.unitPrice) || 0,
      taxRate: Number(li.taxRate) || 0,
      sortOrder: existingCount + i,
    }));
    setValue("lineItems", mapped);
  }
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
