import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quoteSchema } from "@/lib/validators/quote";
import { computeLineItem, computeDocTotals } from "@/lib/tax";

async function ensure(id: string, userId: string) {
  const q = await prisma.quote.findUnique({ where: { id } });
  return q && q.userId === userId ? q : null;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const ok = await ensure(params.id, profile.id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        customer: true,
      },
    });
    return NextResponse.json({ quote });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const ok = await ensure(params.id, profile.id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    const totals = computeDocTotals(data.lineItems);

    await prisma.quoteLineItem.deleteMany({ where: { quoteId: params.id } });

    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: {
        customerId: data.customerId || null,
        status: data.status,
        date: data.date ? new Date(data.date) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        salesperson: data.salesperson,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        publicNote: data.publicNote,
        privateNote: data.privateNote,
        footerNote: data.footerNote,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        pdfPath: null,
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
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        customer: true,
      },
    });

    return NextResponse.json({ quote });
  } catch (e: any) {
    console.error("Quote update error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const ok = await ensure(params.id, profile.id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { status } = await req.json();
    const valid = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED"];
    if (!valid.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: { status },
    });
    return NextResponse.json({ quote });
  } catch (e: any) {
    console.error("Quote status update error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const ok = await ensure(params.id, profile.id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.quote.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
