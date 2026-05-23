import { z } from "zod";

export const itemSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).default(""),
  unitPrice: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  category: z.string().max(100).default(""),
});

export type ItemInput = z.input<typeof itemSchema>;
