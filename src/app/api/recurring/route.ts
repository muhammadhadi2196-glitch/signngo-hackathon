import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const lineItemSchema = z.object({
  itemId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().default(""),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  sortOrder: z.number().int().optional(),
});

const templateDataSchema = z.object({
  lineItems: z.array(lineItemSchema).min(1),
  publicNote: z.string().default(""),
  privateNote: z.string().default(""),
  footerNote: z.string().default(""),
  paymentTerms: z.string().optional(),
  daysUntilDue: z.number().int().min(0).optional(),
  purchaseOrderNumber: z.string().optional(),
  salesperson: z.string().optional(),
  validDays: z.number().int().min(0).optional(),
});

const createSchema = z.object({
  customerId: z.string().min(1),
  type: z.enum(["INVOICE", "QUOTE"]),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  autoSend: z.boolean().default(true),
  maxOccurrences: z.number().int().positive().optional(),
  templateData: templateDataSchema,
});

export async function GET() {
  try {
    const { profile } = await requireUser();
    const schedules = await prisma.recurringSchedule.findMany({
      where: { userId: profile.id },
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { generatedItems: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ schedules });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { profile } = await requireUser();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer || customer.userId !== profile.id) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const startDate = new Date(data.startDate);
    const schedule = await prisma.recurringSchedule.create({
      data: {
        userId: profile.id,
        customerId: data.customerId,
        type: data.type,
        frequency: data.frequency,
        startDate,
        endDate: data.endDate ? new Date(data.endDate) : null,
        nextRunDate: startDate,
        autoSend: data.autoSend,
        maxOccurrences: data.maxOccurrences ?? null,
        templateData: data.templateData,
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
