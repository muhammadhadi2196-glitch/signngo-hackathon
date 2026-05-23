"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pause,
  Play,
  XCircle,
  Trash2,
  Pencil,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type RecurringStatus = "ACTIVE" | "PAUSED" | "CANCELLED" | "COMPLETED";
type RecurringFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
type RecurringType = "INVOICE" | "QUOTE";

interface GeneratedItem {
  id: string;
  generatedAt: string;
  emailSent: boolean;
  invoice: { id: string; number: string; status: string; total: number; date: string } | null;
  quote: { id: string; number: string; status: string; total: number; date: string } | null;
}

interface Schedule {
  id: string;
  type: RecurringType;
  frequency: RecurringFrequency;
  status: RecurringStatus;
  autoSend: boolean;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  lastRunDate: string | null;
  occurrencesRun: number;
  maxOccurrences: number | null;
  templateData: Record<string, unknown>;
  customer: { id: string; name: string; email: string } | null;
  generatedItems: GeneratedItem[];
}

interface Props {
  schedule: Schedule;
}

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

const FREQ_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Every 2 weeks" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

const STATUS_STYLES: Record<RecurringStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  COMPLETED: "bg-slate-100 text-slate-500",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

type LineItem = { name: string; description?: string; quantity: number; unitPrice: number; taxRate: number };

export function RecurringDetail({ schedule: initial }: Props) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [schedule, setSchedule] = useState(initial);
  const [toggling, setToggling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // Edit form state
  const [editFreq, setEditFreq] = useState<RecurringFrequency>(schedule.frequency);
  const [editAutoSend, setEditAutoSend] = useState(schedule.autoSend);
  const [editEndDate, setEditEndDate] = useState(schedule.endDate ? toDateInput(schedule.endDate) : "");
  const [editMaxOcc, setEditMaxOcc] = useState(schedule.maxOccurrences ? String(schedule.maxOccurrences) : "");
  const [saving, setSaving] = useState(false);

  const lineItems = (schedule.templateData.lineItems ?? []) as LineItem[];
  const isTerminal = schedule.status === "CANCELLED" || schedule.status === "COMPLETED";

  async function handleToggle() {
    setToggling(true);
    const newStatus = schedule.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const { schedule: updated } = await api<{ schedule: Schedule }>(`/api/recurring/${schedule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setSchedule((s) => ({ ...s, status: updated.status }));
      success(newStatus === "PAUSED" ? "Schedule paused" : "Schedule resumed");
    } catch (e: any) {
      showError(e.message || "Failed");
    } finally {
      setToggling(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await api(`/api/recurring/${schedule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      setSchedule((s) => ({ ...s, status: "CANCELLED" }));
      success("Schedule cancelled");
      setShowCancel(false);
    } catch (e: any) {
      showError(e.message || "Failed");
    } finally {
      setCancelling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api(`/api/recurring/${schedule.id}`, { method: "DELETE" });
      success("Schedule deleted");
      router.push("/recurring");
    } catch (e: any) {
      showError(e.message || "Failed");
      setDeleting(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        frequency: editFreq,
        autoSend: editAutoSend,
        endDate: editEndDate ? new Date(editEndDate).toISOString() : null,
        maxOccurrences: editMaxOcc ? Number(editMaxOcc) : null,
      };
      const { schedule: updated } = await api<{ schedule: Schedule }>(`/api/recurring/${schedule.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setSchedule((s) => ({
        ...s,
        frequency: updated.frequency,
        autoSend: updated.autoSend,
        endDate: updated.endDate,
        maxOccurrences: updated.maxOccurrences,
      }));
      success("Schedule updated");
      setShowEdit(false);
    } catch (e: any) {
      showError(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Actions bar */}
      <div className="flex flex-wrap gap-2">
        {!isTerminal && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggle}
              loading={toggling}
            >
              {schedule.status === "ACTIVE" ? (
                <><Pause className="h-3.5 w-3.5" /> Pause</>
              ) : (
                <><Play className="h-3.5 w-3.5" /> Resume</>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEdit(true)}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit settings
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCancel(true)}
            >
              <XCircle className="h-3.5 w-3.5" /> Cancel schedule
            </Button>
          </>
        )}
        <Button
          variant="danger"
          size="sm"
          onClick={() => setShowDelete(true)}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Schedule settings
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <div>
            <p className={labelCls}>Status</p>
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[schedule.status])}>
              {schedule.status.charAt(0) + schedule.status.slice(1).toLowerCase()}
            </span>
          </div>
          <div>
            <p className={labelCls}>Type</p>
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              schedule.type === "INVOICE" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
            )}>
              {schedule.type === "INVOICE" ? "Invoice" : "Quote"}
            </span>
          </div>
          <div>
            <p className={labelCls}>Frequency</p>
            <p className="text-slate-900">{FREQ_LABELS[schedule.frequency]}</p>
          </div>
          <div>
            <p className={labelCls}>Customer</p>
            {schedule.customer ? (
              <Link href={`/customers/${schedule.customer.id}`} className="text-blue-600 hover:underline">
                {schedule.customer.name}
              </Link>
            ) : (
              <span className="text-slate-400 italic">No customer</span>
            )}
          </div>
          <div>
            <p className={labelCls}>Auto-send</p>
            <p className="text-slate-900">{schedule.autoSend ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className={labelCls}>Generated</p>
            <p className="text-slate-900">
              {schedule.occurrencesRun}
              {schedule.maxOccurrences ? ` / ${schedule.maxOccurrences}` : ""}
            </p>
          </div>
          <div>
            <p className={labelCls}>Start date</p>
            <p className="text-slate-900">{fmtDate(schedule.startDate)}</p>
          </div>
          <div>
            <p className={labelCls}>End date</p>
            <p className="text-slate-900">{schedule.endDate ? fmtDate(schedule.endDate) : "—"}</p>
          </div>
          {!isTerminal && (
            <div>
              <p className={labelCls}>Next run</p>
              <p className="text-slate-900">{fmtDate(schedule.nextRunDate)}</p>
            </div>
          )}
          <div>
            <p className={labelCls}>Last run</p>
            <p className="text-slate-900">{schedule.lastRunDate ? fmtDate(schedule.lastRunDate) : "Never"}</p>
          </div>
        </div>
      </div>

      {/* Template line items */}
      {lineItems.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Template line items
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 font-medium text-slate-500 text-xs">Item</th>
                <th className="text-right py-2 font-medium text-slate-500 text-xs">Qty</th>
                <th className="text-right py-2 font-medium text-slate-500 text-xs">Unit price</th>
                <th className="text-right py-2 font-medium text-slate-500 text-xs">Tax %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.map((li, i) => (
                <tr key={i}>
                  <td className="py-2 text-slate-900">
                    <p className="font-medium">{li.name}</p>
                    {li.description && (
                      <p className="text-xs text-slate-500">{li.description}</p>
                    )}
                  </td>
                  <td className="py-2 text-right text-slate-600">{li.quantity}</td>
                  <td className="py-2 text-right text-slate-600">{fmtMoney(li.unitPrice)}</td>
                  <td className="py-2 text-right text-slate-600">{li.taxRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generated documents */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Generated documents
          </h2>
        </div>
        {schedule.generatedItems.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            No documents generated yet — the cron runs daily at 09:00 UTC.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {schedule.generatedItems.map((item) => {
              const doc = item.invoice ?? item.quote;
              const href = item.invoice
                ? `/invoices/${item.invoice.id}`
                : item.quote
                ? `/quotes/${item.quote.id}`
                : null;
              return (
                <div key={item.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div>
                      {doc && href ? (
                        <Link href={href} className="font-medium text-sm text-blue-600 hover:underline">
                          {doc.number}
                        </Link>
                      ) : (
                        <span className="font-medium text-sm text-slate-400">—</span>
                      )}
                      <p className="text-xs text-slate-500 mt-0.5">
                        Generated {fmtDate(item.generatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    {doc && (
                      <p className="text-sm font-mono font-medium text-slate-900">
                        {fmtMoney(doc.total)}
                      </p>
                    )}
                    {item.emailSent ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                        <Mail className="h-3 w-3" /> Not sent
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit schedule settings" size="md">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Frequency</label>
              <select
                value={editFreq}
                onChange={(e) => setEditFreq(e.target.value as RecurringFrequency)}
                className={inputCls}
              >
                {FREQ_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>End date <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Max occurrences <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="number"
              min={schedule.occurrencesRun + 1}
              value={editMaxOcc}
              onChange={(e) => setEditMaxOcc(e.target.value)}
              placeholder="Unlimited"
              className={inputCls}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Auto-send</p>
              <p className="text-xs text-slate-500 mt-0.5">Email document to customer on generation.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={editAutoSend}
              onClick={() => setEditAutoSend((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${editAutoSend ? "bg-slate-900" : "bg-slate-200"}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${editAutoSend ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save changes</Button>
          </div>
        </form>
      </Modal>

      {/* Cancel confirm */}
      <Modal open={showCancel} onClose={() => setShowCancel(false)} title="Cancel schedule?">
        <p className="text-sm text-slate-600 mb-4">
          The schedule will stop generating new documents. Already-generated documents are not affected. You cannot reactivate a cancelled schedule.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowCancel(false)}>Keep active</Button>
          <Button variant="danger" onClick={handleCancel} loading={cancelling}>Cancel schedule</Button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Delete schedule?">
        <p className="text-sm text-slate-600 mb-4">
          This permanently deletes the recurring schedule. Already-generated invoices and quotes will not be affected.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
