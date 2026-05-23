import { z } from "zod";

export const businessProfileSchema = z.object({
  businessName: z.string().max(200).default(""),
  displayName: z.string().max(200).default(""),
  address: z.string().max(500).default(""),
  phone: z.string().max(50).default(""),
  email: z.string().email().or(z.literal("")).default(""),
  website: z.string().max(300).default(""),
  taxNumber: z.string().max(50).default(""),
  defaultTaxRate: z.coerce.number().min(0).max(100).default(0),
  defaultInvoiceNote: z.string().max(2000).default(""),
  defaultQuoteNote: z.string().max(2000).default(""),
  defaultFooter: z.string().max(2000).default(""),
  defaultPaymentTerms: z.string().max(100).default("Net 30"),
  invoiceNumberPrefix: z.string().max(20).default("INV-"),
  quoteNumberPrefix: z.string().max(20).default("QTE-"),
  nextInvoiceNumber: z.coerce.number().int().min(1).default(1000),
  nextQuoteNumber: z.coerce.number().int().min(1).default(1000),
  brandColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#2563EB"),
});

export type BusinessProfileInput = z.input<typeof businessProfileSchema>;
