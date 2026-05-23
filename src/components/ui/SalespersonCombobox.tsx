"use client";

import { useEffect, useRef, useState } from "react";
import { Star, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export interface SalespersonOption {
  id: string;
  name: string;
  isDefault: boolean;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  salespeople: SalespersonOption[];
}

export function SalespersonCombobox({ value, onChange, salespeople: initial }: Props) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [typed, setTyped] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { error: showError } = useToast();

  // Show all on open/focus; filter only while user is actively typing
  const filtered = typed
    ? list.filter((s) => s.name.toLowerCase().includes(value.toLowerCase()))
    : list;

  const exactMatch = list.some(
    (s) => s.name.toLowerCase() === value.toLowerCase().trim()
  );
  const canSave = value.trim().length > 0 && !exactMatch;
  const isCustom = value.trim().length > 0 && !exactMatch;

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  async function handleSave() {
    if (!value.trim()) return;
    setCreating(true);
    try {
      const { salesperson } = await api<{ salesperson: SalespersonOption }>(
        "/api/salespeople",
        { method: "POST", body: JSON.stringify({ name: value.trim() }) }
      );
      setList((prev) =>
        [...prev, salesperson].sort(
          (a, b) =>
            Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name)
        )
      );
      onChange(salesperson.name);
      setTyped(false);
      setOpen(false);
    } catch (e: any) {
      showError(e.message || "Failed to save salesperson");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setTyped(true);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          placeholder="Type or select…"
          className="border border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen((o) => !o);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {isCustom && (
        <p className="text-xs text-slate-400 mt-0.5">Custom name — not saved to your list</p>
      )}
      {open && (filtered.length > 0 || canSave) && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s.name);
                setTyped(false);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
            >
              <span>{s.name}</span>
              {s.isDefault && (
                <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5 shrink-0">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Default
                </span>
              )}
            </button>
          ))}
          {canSave && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSave();
              }}
              disabled={creating}
              className="w-full px-3 py-2 text-sm text-left text-blue-600 hover:bg-blue-50 transition-colors border-t border-slate-100 disabled:opacity-50"
            >
              {creating ? "Saving…" : `+ Save "${value.trim()}" as salesperson`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
