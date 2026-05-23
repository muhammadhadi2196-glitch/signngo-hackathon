import { z } from "zod";
import { lineItemSchema } from "./invoice";

export const quoteSchema = z.object({
  customerId: z.string().nullable().optional(),
  quoteNumber: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED", "CONVERTED"]).default("DRAFT"),
  date: z.string().optional(),
  validUntil: z.string().nullable().optional(),
  salesperson: z.string().default(""),
  billingAddress: z.string().default(""),
  shippingAddress: z.string().default(""),
  publicNote: z.string().default(""),
  privateNote: z.string().default(""),
  footerNote: z.string().default(""),
  lineItems: z.array(lineItemSchema).default([]),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
