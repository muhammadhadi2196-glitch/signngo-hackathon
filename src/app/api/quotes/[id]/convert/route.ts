import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextInvoiceNumber } from "@/lib/numbering";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    });
    if (!quote || quote.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (quote.status === "CONVERTED" && quote.convertedToInvoiceId) {
      return NextResponse.json({ invoiceId: quote.convertedToInvoiceId });
    }

    const invoiceNumber = await getNextInvoiceNumber(profile.id);

    const invoice = await prisma.invoice.create({
      data: {
        userId: profile.id,
        customerId: quote.customerId,
        invoiceNumber,
        status: "DRAFT",
        date: new Date(),
        billingAddress: quote.billingAddress,
        shippingAddress: quote.shippingAddress,
        publicNote: quote.publicNote,
        privateNote: quote.privateNote,
        footerNote: quote.footerNote,
        subtotal: quote.subtotal,
        taxTotal: quote.taxTotal,
        total: quote.total,
        balance: quote.total,
        salesperson: quote.salesperson,
        lineItems: {
          create: quote.lineItems.map((li) => ({
            itemId: li.itemId,
            quantity: li.quantity,
            name: li.name,
            description: li.description,
            unitPrice: li.unitPrice,
            taxRate: li.taxRate,
            lineTotal: li.lineTotal,
            sortOrder: li.sortOrder,
          })),
        },
      },
    });

    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "CONVERTED", convertedToInvoiceId: invoice.id },
    });

    return NextResponse.json({ invoiceId: invoice.id });
  } catch (e: any) {
    console.error("Convert error:", e);
    return NextResponse.json({ error: "Convert failed" }, { status: 500 });
  }
}
