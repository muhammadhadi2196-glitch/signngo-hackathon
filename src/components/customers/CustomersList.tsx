"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { api } from "@/lib/api";
import { EmptyState, Pill, useToast, Modal, Button } from "@/components/ui";
import { Users, Pencil, Trash2, Search, Download } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  billingAddress: string;
  createdAt: string;
  _count: { invoices: number; quotes: number };
}

export function CustomersList() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [all, setAll] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api<{ customers: CustomerRow[] }>("/api/customers")
      .then((data) => setAll(data.customers))
      .catch(() => showError("Failed to load customers"))
      .finally(() => setLoading(false));
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(all, {
        keys: ["name", "email", "phone", "billingAddress"],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [all]
  );

  const customers = useMemo(
    () => (query.trim() ? fuse.search(query.trim()).map((r) => r.item) : all),
    [query, fuse, all]
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/customers/${deleteTarget.id}`, { method: "DELETE" });
      success("Customer deleted");
      setAll((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      showError(e.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { utils, writeFile } = await import("xlsx");
      const rows = customers.map((c) => ({
        Name: c.name,
        Email: c.email || "",
        Phone: c.phone || "",
        Address: c.billingAddress || "",
        Invoices: c._count.invoices,
        Quotes: c._count.quotes,
        Created: c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US") : "",
      }));
      const ws = utils.json_to_sheet(rows);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Customers");
      writeFile(wb, "customers.xlsx");
    } catch {
      showError("Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search by name, email, phone, or address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || loading || all.length === 0}
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          )}
          title="Export to Excel"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      {loading ? (
        <SkeletonRows />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title={query ? "No customers match your search" : "No customers yet"}
          description={
            query
              ? "Try a different search term."
              : "Add your first customer to get started."
          }
          action={
            !query
              ? { label: "+ New customer", onClick: () => router.push("/customers/new") }
              : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {/* Desktop table */}
          <table className="hidden sm:table w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Phone
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Invoices
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Quotes
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${c.id}`}
                      className="font-medium text-slate-900 hover:text-blue-700"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {c._count.invoices}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {c._count.quotes}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/customers/${c.id}`}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{c.name}</p>
                  {c.email && (
                    <p className="text-xs text-slate-500 mt-0.5">{c.email}</p>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {c._count.invoices} inv
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete customer"
        size="sm"
      >
        <p className="text-sm text-slate-600 mb-5">
          Are you sure you want to delete{" "}
          <span className="font-medium text-slate-900">{deleteTarget?.name}</span>?
          This won&apos;t delete their invoices or quotes.
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={() => setDeleteTarget(null)}
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
    </>
  );
}

function SkeletonRows() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex gap-4 px-4 py-3 border-b border-slate-100 last:border-0"
        >
          <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
          <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
          <div className="h-4 w-24 rounded bg-slate-100 animate-pulse ml-auto" />
        </div>
      ))}
    </div>
  );
}
