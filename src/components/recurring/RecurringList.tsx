"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat, Pause, Play, Trash2, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowActions } from "@/components/ui/RowActions";

type RecurringStatus = "ACTIVE" | "PAUSED" | "CANCELLED" | "COMPLETED";
type RecurringFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
type RecurringType = "INVOICE" | "QUOTE";

interface ScheduleRow {
  id: string;
  type: RecurringType;
  frequency: RecurringFrequency;
  status: RecurringStatus;
  autoSend: boolean;
  nextRunDate: string;
  lastRunDate: string | null;
  occurrencesRun: number;
  maxOccurrences: number | null;
  customer: { id: string; name: string } | null;
  generatedCount: number;
}

interface Props {
  schedules: ScheduleRow[];
}

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

const STATUS_STYLES: Record<RecurringStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  COMPLETED: "bg-slate-100 text-slate-500",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RecurringList({ schedules: initial }: Props) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [schedules, setSchedules] = useState(initial);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  async function handleToggle(row: ScheduleRow) {
    if (row.status === "CANCELLED" || row.status === "COMPLETED") return;
    setToggling(row.id);
    const newStatus = row.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      await api(`/api/recurring/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setSchedules((prev) =>
        prev.map((s) => (s.id === row.id ? { ...s, status: newStatus } : s))
      );
      success(newStatus === "PAUSED" ? "Schedule paused" : "Schedule resumed");
    } catch (e: any) {
      showError(e.message || "Failed to update");
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/recurring/${deleteTarget.id}`, { method: "DELETE" });
      success("Schedule deleted");
      setSchedules((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      showError(e.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  if (schedules.length === 0) {
    return (
      <EmptyState
        icon={<Repeat className="h-10 w-10" />}
        title="No recurring schedules yet"
        description="Open an invoice or quote and click 'Make recurring' to set one up."
      />
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Customer</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Type</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Frequency</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Next Run</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Generated</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/recurring/${row.id}`)}
                >
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {row.customer?.name ?? <span className="text-slate-400 italic">No customer</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      row.type === "INVOICE"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    )}>
                      {row.type === "INVOICE" ? "Invoice" : "Quote"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{FREQ_LABELS[row.frequency]}</td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      STATUS_STYLES[row.status]
                    )}>
                      {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {row.status === "COMPLETED" || row.status === "CANCELLED"
                      ? "—"
                      : fmtDate(row.nextRunDate)}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {row.generatedCount}
                    {row.maxOccurrences ? ` / ${row.maxOccurrences}` : ""}
                  </td>
                  <td
                    className="py-3 px-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowActions
                      actions={[
                        {
                          icon: <FileText className="h-3.5 w-3.5" />,
                          label: "View",
                          onClick: () => router.push(`/recurring/${row.id}`),
                        },
                        ...(row.status === "ACTIVE" || row.status === "PAUSED"
                          ? [{
                              icon: row.status === "ACTIVE"
                                ? <Pause className="h-3.5 w-3.5" />
                                : <Play className="h-3.5 w-3.5" />,
                              label: row.status === "ACTIVE" ? "Pause" : "Resume",
                              onClick: () => handleToggle(row),
                            }]
                          : []),
                        {
                          icon: <Trash2 className="h-3.5 w-3.5" />,
                          label: "Delete",
                          danger: true,
                          separator: true,
                          onClick: () => setDeleteTarget(row),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {schedules.map((row) => (
            <div
              key={row.id}
              className="p-4 hover:bg-slate-50 cursor-pointer"
              onClick={() => router.push(`/recurring/${row.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">
                    {row.customer?.name ?? "No customer"}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {row.type === "INVOICE" ? "Invoice" : "Quote"} · {FREQ_LABELS[row.frequency]}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Next: {row.status === "COMPLETED" || row.status === "CANCELLED" ? "—" : fmtDate(row.nextRunDate)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_STYLES[row.status]
                  )}>
                    {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    {row.generatedCount} generated
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete recurring schedule?"
      >
        <p className="text-sm text-slate-600 mb-4">
          This will permanently delete the recurring schedule for{" "}
          <strong>{deleteTarget?.customer?.name ?? "this customer"}</strong>. Already
          generated invoices and quotes will not be affected.
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
