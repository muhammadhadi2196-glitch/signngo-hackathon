import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quoteSchema } from "@/lib/validators/quote";
import { computeLineItem, computeDocTotals } from "@/lib/tax";
import { getNextQuoteNumber } from "@/lib/numbering";

export async function GET(req: Request) {
  try {
    const { profile } = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const q = (searchParams.get("q") || "").trim();

    const quotes = await prisma.quote.findMany({
      where: {
        userId: profile.id,
        ...(status ? { status: status as any } : {}),
        ...(q
          ? {
              OR: [
                { quoteNumber: { contains: q, mode: "insensitive" } },
                { customer: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ quotes });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { profile } = await requireUser();
    const body = await req.json();
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const quoteNumber =
      data.quoteNumber || (await getNextQuoteNumber(profile.id));
    const totals = computeDocTotals(data.lineItems);

    let billingAddress = data.billingAddress;
    let shippingAddress = data.shippingAddress;
    if (data.customerId && (!billingAddress || !shippingAddress)) {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
      });
      if (customer && customer.userId === profile.id) {
        if (!billingAddress) billingAddress = customer.billingAddress;
        if (!shippingAddress) shippingAddress = customer.shippingAddress;
      }
    }

    const quote = await prisma.quote.create({
      data: {
        userId: profile.id,
        customerId: data.customerId || null,
        quoteNumber,
        status: data.status,
        date: data.date ? new Date(data.date) : new Date(),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        salesperson: data.salesperson,
        billingAddress,
        shippingAddress,
        publicNote: data.publicNote,
        privateNote: data.privateNote,
        footerNote: data.footerNote,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        lineItems: {
          create: data.lineItems.map((li, i) => {
            const r = computeLineItem(li);
            return {
              itemId: li.itemId || null,
              quantity: li.quantity,
              name: li.name,
              description: li.description,
              unitPrice: li.unitPrice,
              taxRate: li.taxRate,
              lineTotal: r.lineTotal,
              sortOrder: li.sortOrder ?? i,
            };
          }),
        },
      },
      include: { lineItems: true, customer: true },
    });

    return NextResponse.json({ quote }, { status: 201 });
  } catch (e: any) {
    console.error("Quote create error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
