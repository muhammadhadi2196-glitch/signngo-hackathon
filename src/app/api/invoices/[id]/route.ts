import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validators/invoice";
import { computeLineItem, computeDocTotals } from "@/lib/tax";

async function ensure(id: string, userId: string) {
  const inv = await prisma.invoice.findUnique({ where: { id } });
  return inv && inv.userId === userId ? inv : null;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const ok = await ensure(params.id, profile.id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        customer: true,
      },
    });
    return NextResponse.json({ invoice });
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
    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    const totals = computeDocTotals(data.lineItems);

    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: params.id } });

    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        customerId: data.customerId || null,
        status: data.status,
        date: data.date ? new Date(data.date) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        paymentTerms: data.paymentTerms,
        purchaseOrderNumber: data.purchaseOrderNumber,
        salesperson: data.salesperson,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        publicNote: data.publicNote,
        privateNote: data.privateNote,
        footerNote: data.footerNote,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        balance: totals.total,
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

    return NextResponse.json({ invoice });
  } catch (e: any) {
    console.error("Invoice update error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
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
    await prisma.invoice.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
