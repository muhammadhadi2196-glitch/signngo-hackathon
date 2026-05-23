"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Trash2, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ItemOption {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  taxRate: number;
}

interface LineItemRow {
  itemId?: string | null;
  quantity: number;
  name: string;
  description: string;
  unitPrice: number;
  taxRate: number;
  sortOrder: number;
}

interface Props {
  fieldName?: string;
  items: ItemOption[];
  defaultTaxRate?: number;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function LineItemsTable({ fieldName = "lineItems", items, defaultTaxRate = 0 }: Props) {
  const { register, control, watch, setValue } = useFormContext<any>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: fieldName,
  });

  const watched: LineItemRow[] = watch(fieldName) || [];

  function handleItemSelect(index: number, itemId: string) {
    const item = items.find((it) => it.id === itemId);
    if (!item) return;
    setValue(`${fieldName}.${index}.itemId`, item.id);
    setValue(`${fieldName}.${index}.name`, item.name);
    setValue(`${fieldName}.${index}.description`, item.description);
    setValue(`${fieldName}.${index}.unitPrice`, item.unitPrice);
    setValue(`${fieldName}.${index}.taxRate`, item.taxRate);
  }

  function addRow() {
    append({
      itemId: null,
      quantity: 1,
      name: "",
      description: "",
      unitPrice: 0,
      taxRate: defaultTaxRate,
      sortOrder: fields.length,
    });
  }

  return (
    <div>
      {/* Desktop table header */}
      <div className="hidden md:grid grid-cols-[40px_1fr_2fr_110px_90px_100px_40px] gap-2 px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-200">
        <span></span>
        <span>Item</span>
        <span>Description</span>
        <span className="text-right">Unit Price</span>
        <span className="text-right">Tax %</span>
        <span className="text-right">Total</span>
        <span></span>
      </div>

      <div className="divide-y divide-slate-100">
        {fields.map((field, index) => {
          const row = watched[index] || {};
          const qty = Number(row.quantity) || 0;
          const price = Number(row.unitPrice) || 0;
          const tax = Number(row.taxRate) || 0;
          const subtotal = qty * price;
          const lineTotal = subtotal * (1 + tax / 100);

          return (
            <div
              key={field.id}
              className="grid grid-cols-1 md:grid-cols-[40px_1fr_2fr_110px_90px_100px_40px] gap-2 py-2 px-2 items-start"
            >
              {/* Reorder buttons */}
              <div className="hidden md:flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => index > 0 && move(index, index - 1)}
                  disabled={index === 0}
                  className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => index < fields.length - 1 && move(index, index + 1)}
                  disabled={index === fields.length - 1}
                  className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Item preset select + name */}
              <div className="flex flex-col gap-1">
                <select
                  className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={row.itemId || ""}
                  onChange={(e) =>
                    e.target.value
                      ? handleItemSelect(index, e.target.value)
                      : setValue(`${fieldName}.${index}.itemId`, null)
                  }
                >
                  <option value="">— Select item —</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
                <input
                  {...register(`${fieldName}.${index}.name`)}
                  placeholder="Item name"
                  className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Description */}
              <textarea
                {...register(`${fieldName}.${index}.description`)}
                placeholder="Description (optional)"
                rows={2}
                className="border border-slate-300 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-slate-400"
              />

              {/* Unit Price */}
              <div className="flex flex-col gap-0.5">
                <label className="md:hidden text-xs text-slate-500">Unit Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register(`${fieldName}.${index}.unitPrice`, {
                    valueAsNumber: true,
                  })}
                  className="border border-slate-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Tax % */}
              <div className="flex flex-col gap-0.5">
                <label className="md:hidden text-xs text-slate-500">Tax %</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register(`${fieldName}.${index}.taxRate`, {
                    valueAsNumber: true,
                  })}
                  className="border border-slate-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Line total */}
              <div className="flex items-start justify-end pt-1.5">
                <span className="text-sm font-medium text-slate-900 font-mono">
                  {fmt(lineTotal)}
                </span>
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => remove(index)}
                className="flex items-start justify-center pt-1.5 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="pt-3 pb-1 border-t border-slate-100 mt-1">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add line item
        </button>
      </div>
    </div>
  );
}
