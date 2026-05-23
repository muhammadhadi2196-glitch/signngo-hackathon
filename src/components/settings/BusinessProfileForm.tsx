"use client";

import React, { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  businessProfileSchema,
  type BusinessProfileInput,
} from "@/lib/validators/businessProfile";
import { Input, Textarea, Button, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { Upload, X, Building2 } from "lucide-react";
interface SerializedBusinessProfile {
  businessName: string;
  displayName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxNumber: string;
  defaultTaxRate: number;
  defaultInvoiceNote: string;
  defaultQuoteNote: string;
  defaultFooter: string;
  defaultPaymentTerms: string;
  invoiceNumberPrefix: string;
  quoteNumberPrefix: string;
  nextInvoiceNumber: number;
  nextQuoteNumber: number;
  brandColor: string;
}

interface BusinessProfileFormProps {
  initial: SerializedBusinessProfile;
  logoPublicUrl: string | null;
}

export function BusinessProfileForm({
  initial,
  logoPublicUrl,
}: BusinessProfileFormProps) {
  const { success, error: showError } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoPublicUrl);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<BusinessProfileInput>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      businessName: initial.businessName,
      displayName: initial.displayName,
      address: initial.address,
      phone: initial.phone,
      email: initial.email,
      website: initial.website,
      taxNumber: initial.taxNumber,
      defaultTaxRate: initial.defaultTaxRate,
      defaultInvoiceNote: initial.defaultInvoiceNote,
      defaultQuoteNote: initial.defaultQuoteNote,
      defaultFooter: initial.defaultFooter,
      defaultPaymentTerms: initial.defaultPaymentTerms,
      invoiceNumberPrefix: initial.invoiceNumberPrefix,
      quoteNumberPrefix: initial.quoteNumberPrefix,
      nextInvoiceNumber: initial.nextInvoiceNumber,
      nextQuoteNumber: initial.nextQuoteNumber,
      brandColor: initial.brandColor,
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  const brandColor = watch("brandColor");

  async function onSubmit(data: BusinessProfileInput) {
    try {
      await api("/api/business-profile", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      success("Settings saved");
      reset(data);
    } catch (e: any) {
      showError(e.message || "Failed to save");
    }
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/business-profile/logo", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Upload failed");
      }
      const data = await res.json();
      setPreviewUrl(data.publicUrl ?? null);
      success("Logo updated");
    } catch (e: any) {
      showError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleLogoRemove() {
    try {
      await fetch("/api/business-profile/logo", { method: "DELETE" });
      setPreviewUrl(null);
      success("Logo removed");
    } catch {
      showError("Failed to remove logo");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Logo + Identity */}
        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Identity
          </h2>

          {/* Logo uploader */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Business logo
            </label>
            <div className="flex items-start gap-4">
              <div className="h-24 w-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Business logo"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-slate-300" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {previewUrl ? "Replace" : "Upload logo"}
                </Button>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleLogoRemove}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Remove
                  </button>
                )}
                <p className="text-xs text-slate-400">PNG, JPG, SVG · max 5MB</p>
              </div>
            </div>
          </div>

          <Input
            label="Business name"
            placeholder="Acme Contracting Ltd."
            error={errors.businessName?.message}
            {...register("businessName")}
          />
          <Input
            label="Display name"
            placeholder="Acme Contracting"
            helper="Shown at the top of invoices and quotes"
            error={errors.displayName?.message}
            {...register("displayName")}
          />
          <Input
            label="Phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Input
            label="Email"
            type="email"
            placeholder="info@yourbusiness.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Website"
            type="url"
            placeholder="https://yourbusiness.com"
            error={errors.website?.message}
            {...register("website")}
          />

          {/* Brand color */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Brand color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandColor}
                onChange={(e) =>
                  setValue("brandColor", e.target.value, { shouldDirty: true })
                }
                className="h-10 w-10 rounded-md border border-slate-300 cursor-pointer p-0.5"
              />
              <Input
                placeholder="#2563EB"
                className="font-mono uppercase"
                error={errors.brandColor?.message}
                {...register("brandColor")}
                onChange={(e) => {
                  const v = e.target.value;
                  register("brandColor").onChange(e);
                  if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
                    setValue("brandColor", v, { shouldDirty: true });
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Address + Tax + Defaults */}
        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Address & Tax
          </h2>

          <Textarea
            label="Business address"
            placeholder="123 Main St&#10;Suite 400&#10;City, Province A1B 2C3"
            rows={3}
            error={errors.address?.message}
            {...register("address")}
          />
          <Input
            label="GST / Tax / EIN Number"
            placeholder="123456789 RT0001"
            error={errors.taxNumber?.message}
            {...register("taxNumber")}
          />
          <Input
            label="Default tax rate (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="5.00"
            error={errors.defaultTaxRate?.message}
            {...register("defaultTaxRate")}
          />
          <Input
            label="Default payment terms"
            placeholder="Net 30"
            error={errors.defaultPaymentTerms?.message}
            {...register("defaultPaymentTerms")}
          />

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
              Numbering
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Invoice prefix"
                placeholder="INV-"
                error={errors.invoiceNumberPrefix?.message}
                {...register("invoiceNumberPrefix")}
              />
              <Input
                label="Next number"
                type="number"
                min="1"
                error={errors.nextInvoiceNumber?.message}
                {...register("nextInvoiceNumber")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Input
                label="Quote prefix"
                placeholder="QTE-"
                error={errors.quoteNumberPrefix?.message}
                {...register("quoteNumberPrefix")}
              />
              <Input
                label="Next number"
                type="number"
                min="1"
                error={errors.nextQuoteNumber?.message}
                {...register("nextQuoteNumber")}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
              Default text
            </h2>
            <Textarea
              label="Default invoice note"
              placeholder="Thank you for your business!"
              rows={2}
              error={errors.defaultInvoiceNote?.message}
              {...register("defaultInvoiceNote")}
            />
            <Textarea
              label="Default quote note"
              placeholder="This quote is valid for 30 days."
              rows={2}
              error={errors.defaultQuoteNote?.message}
              {...register("defaultQuoteNote")}
            />
            <Textarea
              label="Default footer"
              placeholder="Payment due within 30 days of invoice date."
              rows={2}
              error={errors.defaultFooter?.message}
              {...register("defaultFooter")}
            />
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={!isDirty || isSubmitting}
          onClick={() => reset()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="accent"
          size="md"
          loading={isSubmitting}
          disabled={!isDirty}
        >
          Save changes
        </Button>
      </div>
    </form>
  );
}
