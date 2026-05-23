"use client";

import { useEffect, useState } from "react";
import { Star, Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

interface Salesperson {
  id: string;
  name: string;
  isDefault: boolean;
}

export function SalespeopleSettings() {
  const { success, error: showError } = useToast();
  const [list, setList] = useState<Salesperson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDefault, setAddDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const confirmTarget = list.find((s) => s.id === confirmDeleteId);

  useEffect(() => {
    api<{ salespeople: Salesperson[] }>("/api/salespeople")
      .then((d) => setList(d.salespeople))
      .catch(() => showError("Failed to load salespeople"))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!addName.trim()) return;
    setSaving(true);
    try {
      const { salesperson } = await api<{ salesperson: Salesperson }>("/api/salespeople", {
        method: "POST",
        body: JSON.stringify({ name: addName.trim(), isDefault: addDefault }),
      });
      setList((prev) => {
        const cleared = addDefault ? prev.map((s) => ({ ...s, isDefault: false })) : prev;
        return [...cleared, salesperson].sort(
          (a, b) =>
            Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name)
        );
      });
      setAddName("");
      setAddDefault(false);
      setShowAdd(false);
      success("Salesperson added");
    } catch (e: any) {
      showError(e.message || "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: string) {
    if (!editName.trim()) return;
    try {
      const { salesperson } = await api<{ salesperson: Salesperson }>(
        `/api/salespeople/${id}`,
        { method: "PATCH", body: JSON.stringify({ name: editName.trim() }) }
      );
      setList((prev) => prev.map((s) => (s.id === id ? salesperson : s)));
      setEditId(null);
      success("Updated");
    } catch (e: any) {
      showError(e.message || "Failed to update");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await api(`/api/salespeople/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDefault: true }),
      });
      setList((prev) => prev.map((s) => ({ ...s, isDefault: s.id === id })));
    } catch (e: any) {
      showError(e.message || "Failed to update");
    }
  }

  async function handleDelete(id: string) {
    try {
      await api(`/api/salespeople/${id}`, { method: "DELETE" });
      setList((prev) => prev.filter((s) => s.id !== id));
      success("Deleted");
    } catch (e: any) {
      showError(e.message || "Failed to delete");
    }
  }

  return (
    <div className="border-t border-slate-100 pt-8 mt-2">
      <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-1">
        Salespeople
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Quickly select who&apos;s responsible for each quote and invoice.
      </p>

      {loading ? (
        <div className="space-y-2 mb-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {list.length === 0 && !showAdd && (
            <p className="text-sm text-slate-400 italic mb-3">
              Add your first salesperson to make quoting faster.
            </p>
          )}
          {list.length > 0 && (
            <div className="space-y-1 mb-3">
              {list.map((s) => (
                <div key={s.id} className="flex items-center gap-2 py-1">
                  {editId === s.id ? (
                    <>
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEdit(s.id);
                          if (e.key === "Escape") setEditId(null);
                        }}
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                      <button
                        onClick={() => handleEdit(s.id)}
                        className="p-1.5 rounded text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="p-1.5 rounded text-slate-400 hover:bg-slate-100 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-slate-800">{s.name}</span>
                      {s.isDefault ? (
                        <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5 mr-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Default
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(s.id)}
                          title="Set as default"
                          className="p-1.5 rounded text-slate-300 hover:text-amber-500 transition-colors"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditId(s.id);
                          setEditName(s.name);
                        }}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(s.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showAdd ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") {
                setShowAdd(false);
                setAddName("");
                setAddDefault(false);
              }
            }}
            placeholder="Name"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <label className="flex items-center gap-1.5 text-sm text-slate-600 whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={addDefault}
              onChange={(e) => setAddDefault(e.target.checked)}
              className="rounded border-slate-300"
            />
            Default
          </label>
          <Button variant="primary" size="sm" onClick={handleAdd} loading={saving} type="button">
            Save
          </Button>
          <button
            onClick={() => {
              setShowAdd(false);
              setAddName("");
              setAddDefault(false);
            }}
            className="p-1.5 rounded text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add salesperson
        </button>
      )}

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              Delete {confirmTarget.name}?
            </h2>
            <p className="text-sm text-slate-500">
              Existing quotes and invoices that used this salesperson will keep the name on record.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete(confirmDeleteId!);
                  setConfirmDeleteId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
