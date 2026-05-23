"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerInput } from "@/lib/validators/customer";
import { Input, Textarea, Button, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import type { Customer } from "@prisma/client";

interface CustomerFormProps {
  mode: "create" | "edit";
  initial?: Customer;
  onSuccess?: (customer: Customer) => void;
}

export function CustomerForm({ mode, initial, onSuccess }: CustomerFormProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      billingAddress: initial?.billingAddress ?? "",
      shippingAddress: initial?.shippingAddress ?? "",
      notes: initial?.notes ?? "",
    },
  });

  async function onSubmit(data: CustomerInput) {
    try {
      const result =
        mode === "create"
          ? await api<{ customer: Customer }>("/api/customers", {
              method: "POST",
              body: JSON.stringify(data),
            })
          : await api<{ customer: Customer }>(`/api/customers/${initial!.id}`, {
              method: "PUT",
              body: JSON.stringify(data),
            });

      success(mode === "create" ? "Customer created" : "Customer updated");

      if (onSuccess) {
        onSuccess(result.customer);
      } else {
        router.push(`/customers/${result.customer.id}`);
        router.refresh();
      }
    } catch (e: any) {
      showError(e.message || "Failed to save customer");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Name"
        placeholder="Jane Smith"
        error={errors.name?.message}
        {...register("name")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Email"
          type="email"
          placeholder="jane@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Phone"
          type="tel"
          placeholder="+1 (555) 000-0000"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>
      <Textarea
        label="Billing address"
        placeholder="123 Main St, City, Province A1B 2C3"
        rows={2}
        error={errors.billingAddress?.message}
        {...register("billingAddress")}
      />
      <Textarea
        label="Shipping address"
        placeholder="Same as billing, or enter a different address"
        rows={2}
        error={errors.shippingAddress?.message}
        {...register("shippingAddress")}
      />
      <Textarea
        label="Notes"
        placeholder="Internal notes about this customer (not shown to them)"
        rows={2}
        error={errors.notes?.message}
        {...register("notes")}
      />
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" variant="accent" size="md" loading={isSubmitting}>
          {mode === "create" ? "Create customer" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
