import { z } from "zod";

export const lineItemSchema = z.object({
  itemId: z.string().nullable().optional(),
  quantity: z.coerce.number().min(0).default(1),
  name: z.string().default(""),
  description: z.string().default(""),
  unitPrice: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  sortOrder: z.coerce.number().int().default(0),
});

export const invoiceSchema = z.object({
  customerId: z.string().nullable().optional(),
  invoiceNumber: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE", "VOID"]).default("DRAFT"),
  date: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  paymentTerms: z.string().default("Net 30"),
  purchaseOrderNumber: z.string().default(""),
  salesperson: z.string().default(""),
  billingAddress: z.string().default(""),
  shippingAddress: z.string().default(""),
  publicNote: z.string().default(""),
  privateNote: z.string().default(""),
  footerNote: z.string().default(""),
  lineItems: z.array(lineItemSchema).default([]),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
