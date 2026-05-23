import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf } from "@/lib/pdf/invoicePdf";
import {
  uploadFile,
  getSignedUrl,
  getPublicUrl,
} from "@/lib/storage/supabaseStorage";
import { sendEmail } from "@/lib/email/send";
import { InvoiceEmail } from "@/lib/email/templates/InvoiceEmail";
import React from "react";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const body = await req.json().catch(() => ({}));
    const overrideEmail: string | undefined = body?.email;
    const customMessage: string | undefined = body?.message;

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

    const recipientEmail = overrideEmail || invoice.customer?.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Customer email is required" },
        { status: 400 }
      );
    }

    const business = profile.businessProfile!;
    const logoUrl =
      business.logoPath && process.env.SUPABASE_BUCKET_LOGOS
        ? getPublicUrl(process.env.SUPABASE_BUCKET_LOGOS, business.logoPath)
        : null;

    const buf = await renderToBuffer(
      React.createElement(InvoicePdf, { invoice, business, logoUrl }) as any
    );

    const bucket = process.env.SUPABASE_BUCKET_DOCUMENTS!;
    const path = `${profile.id}/invoices/${invoice.id}.pdf`;
    await uploadFile(bucket, path, buf, "application/pdf");
    const signed = await getSignedUrl(bucket, path, 60 * 60 * 24 * 30);

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfPath: path, status: "SENT" },
    });

    let emailSent = false;
    try {
      await sendEmail({
        to: recipientEmail,
        subject: `Invoice ${invoice.invoiceNumber} from ${business.displayName || business.businessName}`,
        react: React.createElement(InvoiceEmail, {
          invoice,
          business,
          logoUrl,
          downloadUrl: signed,
          customMessage,
        }),
        replyTo: business.email || undefined,
        attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: buf.toString("base64") }],
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("Invoice email send failed (non-fatal):", emailErr);
    }

    return NextResponse.json({ ok: true, emailSent });
  } catch (e: any) {
    console.error("Invoice send error:", e);
    return NextResponse.json(
      { error: e?.message || "Send failed" },
      { status: 500 }
    );
  }
}
