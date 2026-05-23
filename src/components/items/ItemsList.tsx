"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, Button, Modal, useToast } from "@/components/ui";
import { Package, Pencil, Trash2, Search, Plus } from "lucide-react";
import { ItemFormModal } from "./ItemFormModal";
import type { Item } from "@prisma/client";

export function ItemsList() {
  const { success, error: showError } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetch_ = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await api<{ items: Item[] }>(
        `/api/items${q ? `?q=${encodeURIComponent(q)}` : ""}`
      );
      setItems(data.items);
    } catch {
      showError("Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetch_(query), query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query, fetch_]);

  function handleSaved(item: Item) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/items/${deleteTarget.id}`, { method: "DELETE" });
      success("Item deleted");
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      showError(e.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search by name or category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4" />
          New item
        </Button>
      </div>

      {loading ? (
        <SkeletonRows />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package className="h-10 w-10" />}
          title={query ? "No items match your search" : "No items yet"}
          description={
            query
              ? "Try a different search term."
              : "Create items and services to quickly add them to invoices."
          }
          action={
            !query
              ? { label: "+ New item", onClick: () => setShowCreate(true) }
              : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                  Category
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Price
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                  Tax
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-slate-500 truncate max-w-xs">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                    {item.category || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    ${Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 hidden sm:table-cell tabular-nums">
                    {Number(item.taxRate).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditTarget(item)}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
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
        </div>
      )}

      <ItemFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        mode="create"
        onSaved={handleSaved}
      />

      {editTarget && (
        <ItemFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          mode="edit"
          initial={editTarget}
          onSaved={(item) => {
            handleSaved(item);
            setEditTarget(null);
          }}
        />
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete item"
        size="sm"
      >
        <p className="text-sm text-slate-600 mb-5">
          Delete{" "}
          <span className="font-medium text-slate-900">{deleteTarget?.name}</span>?
          Existing line items on invoices won&apos;t be affected.
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
          <div className="h-4 w-20 rounded bg-slate-100 animate-pulse ml-auto" />
        </div>
      ))}
    </div>
  );
}
