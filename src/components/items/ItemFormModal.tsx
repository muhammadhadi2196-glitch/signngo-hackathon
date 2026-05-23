"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemSchema, type ItemInput } from "@/lib/validators/item";
import { Input, Textarea, Select, Button, Modal, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import type { Item } from "@prisma/client";

const CATEGORIES = ["Service", "Labour", "Materials", "Consultation", "Subscription", "Other"];

interface ItemFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initial?: Item;
  onSaved: (item: Item) => void;
}

export function ItemFormModal({
  open,
  onClose,
  mode,
  initial,
  onSaved,
}: ItemFormModalProps) {
  const { success, error: showError } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      unitPrice: Number(initial?.unitPrice ?? 0),
      taxRate: Number(initial?.taxRate ?? 0),
      category: initial?.category ?? "",
    },
  });

  async function onSubmit(data: ItemInput) {
    try {
      const result =
        mode === "create"
          ? await api<{ item: Item }>("/api/items", {
              method: "POST",
              body: JSON.stringify(data),
            })
          : await api<{ item: Item }>(`/api/items/${initial!.id}`, {
              method: "PUT",
              body: JSON.stringify(data),
            });

      success(mode === "create" ? "Item created" : "Item updated");
      onSaved(result.item);
      onClose();
      if (mode === "create") reset();
    } catch (e: any) {
      showError(e.message || "Failed to save item");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "New item" : "Edit item"}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Name"
          placeholder="Lawn mowing service"
          error={errors.name?.message}
          {...register("name")}
        />
        <Textarea
          label="Description"
          placeholder="Optional description shown on invoices"
          rows={2}
          error={errors.description?.message}
          {...register("description")}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Unit price ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            error={errors.unitPrice?.message}
            {...register("unitPrice")}
          />
          <Input
            label="Tax rate (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="0.00"
            error={errors.taxRate?.message}
            {...register("taxRate")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Category</label>
          <input
            list="item-categories"
            placeholder="Service"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
            {...register("category")}
          />
          <datalist id="item-categories">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="accent"
            size="md"
            className="flex-1"
            loading={isSubmitting}
          >
            {mode === "create" ? "Create item" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
