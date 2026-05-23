"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

type RecurringType = "INVOICE" | "QUOTE";
type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

interface TemplateData {
  lineItems: {
    name: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    sortOrder?: number;
  }[];
  publicNote: string;
  privateNote: string;
  footerNote: string;
  paymentTerms?: string;
  purchaseOrderNumber?: string;
  salesperson?: string;
  daysUntilDue?: number;
  validDays?: number;
}

interface Props {
  type: RecurringType;
  customerId: string | null;
  templateData: TemplateData;
}

const FREQ_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Every 2 weeks" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function MakeRecurringButton({ type, customerId, templateData }: Props) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [frequency, setFrequency] = useState<Frequency>("MONTHLY");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [autoSend, setAutoSend] = useState(true);
  const [maxOccurrences, setMaxOccurrences] = useState("");
  const [daysUntilDue, setDaysUntilDue] = useState(
    String(templateData.daysUntilDue ?? 30)
  );
  const [validDays, setValidDays] = useState(
    String(templateData.validDays ?? 30)
  );

  if (!customerId) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        customerId,
        type,
        frequency,
        startDate: new Date(startDate).toISOString(),
        autoSend,
        templateData: {
          ...templateData,
          ...(type === "INVOICE" ? { daysUntilDue: Number(daysUntilDue) || 30 } : {}),
          ...(type === "QUOTE" ? { validDays: Number(validDays) || 30 } : {}),
        },
      };
      if (endDate) body.endDate = new Date(endDate).toISOString();
      if (maxOccurrences) body.maxOccurrences = Number(maxOccurrences);

      await api("/api/recurring", { method: "POST", body: JSON.stringify(body) });
      success("Recurring schedule created");
      setOpen(false);
      router.push("/recurring");
    } catch (e: any) {
      showError(e.message || "Failed to create schedule");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 font-medium rounded-md h-9 px-4 text-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Repeat className="h-3.5 w-3.5" />
        Make recurring
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Create recurring schedule" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className={inputCls}
              >
                {FREQ_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Start date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>End date <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Max occurrences <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="number"
                min={1}
                value={maxOccurrences}
                onChange={(e) => setMaxOccurrences(e.target.value)}
                placeholder="Unlimited"
                className={inputCls}
              />
            </div>
          </div>

          {type === "INVOICE" && (
            <div className="w-1/2 pr-2">
              <label className={labelCls}>Days until due</label>
              <input
                type="number"
                min={0}
                required
                value={daysUntilDue}
                onChange={(e) => setDaysUntilDue(e.target.value)}
                className={inputCls}
              />
            </div>
          )}

          {type === "QUOTE" && (
            <div className="w-1/2 pr-2">
              <label className={labelCls}>Quote valid for (days)</label>
              <input
                type="number"
                min={0}
                required
                value={validDays}
                onChange={(e) => setValidDays(e.target.value)}
                className={inputCls}
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Auto-send</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Email the {type === "INVOICE" ? "invoice" : "quote"} to the customer automatically when generated.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSend}
              onClick={() => setAutoSend((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                autoSend ? "bg-slate-900" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                  autoSend ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Line items, notes, and terms from this {type === "INVOICE" ? "invoice" : "quote"} will be used as the template for each generated document.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create schedule
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
