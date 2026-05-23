import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf } from "@/lib/pdf/invoicePdf";
import { getPublicUrl } from "@/lib/storage/supabaseStorage";
import React from "react";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        customer: true,
      },
    });
    if (!invoice || invoice.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const business = profile.businessProfile!;
    const logoUrl =
      business.logoPath && process.env.SUPABASE_BUCKET_LOGOS
        ? getPublicUrl(process.env.SUPABASE_BUCKET_LOGOS, business.logoPath)
        : null;

    const buf = await renderToBuffer(
      React.createElement(InvoicePdf, { invoice, business, logoUrl }) as any
    );

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("PDF error:", e);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
