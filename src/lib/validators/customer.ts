import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email().or(z.literal("")).default(""),
  phone: z.string().max(50).default(""),
  billingAddress: z.string().max(500).default(""),
  shippingAddress: z.string().max(500).default(""),
  notes: z.string().max(2000).default(""),
});

export type CustomerInput = z.input<typeof customerSchema>;
