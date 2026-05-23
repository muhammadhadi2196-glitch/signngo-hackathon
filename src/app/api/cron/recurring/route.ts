import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, RecurringFrequency } from "@prisma/client";
import { computeLineItem, computeDocTotals } from "@/lib/tax";
import { getNextInvoiceNumber, getNextQuoteNumber } from "@/lib/numbering";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf } from "@/lib/pdf/invoicePdf";
import { QuotePdf } from "@/lib/pdf/quotePdf";
import { uploadFile, getSignedUrl, getPublicUrl } from "@/lib/storage/supabaseStorage";
import { sendEmail } from "@/lib/email/send";
import { InvoiceEmail } from "@/lib/email/templates/InvoiceEmail";
import { QuoteEmail } from "@/lib/email/templates/QuoteEmail";
import React from "react";

const scheduleInclude = {
  customer: true,
  user: { include: { businessProfile: true } },
} satisfies Prisma.RecurringScheduleInclude;

type ScheduleWithRelations = Prisma.RecurringScheduleGetPayload<{
  include: typeof scheduleInclude;
}>;

type TemplateData = {
  lineItems: {
    itemId?: string;
    name: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    sortOrder?: number;
  }[];
  publicNote?: string;
  privateNote?: string;
  footerNote?: string;
  paymentTerms?: string;
  daysUntilDue?: number;
  purchaseOrderNumber?: string;
  salesperson?: string;
  validDays?: number;
};

function advanceDate(date: Date, frequency: RecurringFrequency): Date {
  const d = new Date(date);
  switch (frequency) {
    case "WEEKLY":    d.setDate(d.getDate() + 7);         break;
    case "BIWEEKLY":  d.setDate(d.getDate() + 14);        break;
    case "MONTHLY":   d.setMonth(d.getMonth() + 1);       break;
    case "QUARTERLY": d.setMonth(d.getMonth() + 3);       break;
    case "YEARLY":    d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const dueSchedules = await prisma.recurringSchedule.findMany({
    where: { status: "ACTIVE", nextRunDate: { lte: now } },
    include: scheduleInclude,
  });

  const results = await Promise.allSettled(
    dueSchedules.map((schedule) => processSchedule(schedule, now))
  );

  const summary = results.map((r, i) => ({
    scheduleId: dueSchedules[i].id,
    status: r.status,
    ...(r.status === "rejected" ? { error: String(r.reason) } : {}),
  }));

  console.log("[cron/recurring] processed", dueSchedules.length, "schedules:", summary);
  return NextResponse.json({ processed: dueSchedules.length, summary });
}

async function processSchedule(schedule: ScheduleWithRelations, now: Date) {
  const td = schedule.templateData as TemplateData;
  const { userId, customer, user } = schedule;
  const business = user.businessProfile!;

  const logoUrl = business.logoPath && process.env.SUPABASE_BUCKET_LOGOS
    ? getPublicUrl(process.env.SUPABASE_BUCKET_LOGOS, business.logoPath)
    : null;

  const lineItemsForDb = td.lineItems.map((li, i) => {
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
  });
  const totals = computeDocTotals(td.lineItems);

  let generatedInvoiceId: string | null = null;
  let generatedQuoteId: string | null = null;
  let emailSent = false;

  if (schedule.type === "INVOICE") {
    const invoiceNumber = await getNextInvoiceNumber(userId);
    const dueDate = td.daysUntilDue != null
      ? new Date(now.getTime() + td.daysUntilDue * 86400000)
      : null;

    const invoice = await prisma.invoice.create({
      data: {
        userId,
        customerId: customer.id,
        invoiceNumber,
        status: "DRAFT",
        date: now,
        dueDate,
        paymentTerms: td.paymentTerms ?? business.defaultPaymentTerms,
        purchaseOrderNumber: td.purchaseOrderNumber ?? "",
        salesperson: td.salesperson ?? "",
        billingAddress: customer.billingAddress,
        shippingAddress: customer.shippingAddress,
        publicNote: td.publicNote ?? "",
        privateNote: td.privateNote ?? "",
        footerNote: td.footerNote ?? "",
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        balance: totals.total,
        lineItems: { create: lineItemsForDb },
      },
      include: { lineItems: { orderBy: { sortOrder: "asc" } }, customer: true },
    });
    generatedInvoiceId = invoice.id;

    if (schedule.autoSend && customer.email) {
      try {
        const buf = await renderToBuffer(
          React.createElement(InvoicePdf, { invoice, business, logoUrl }) as any
        );
        const bucket = process.env.SUPABASE_BUCKET_DOCUMENTS!;
        const path = `${userId}/invoices/${invoice.id}.pdf`;
        await uploadFile(bucket, path, buf, "application/pdf");
        const downloadUrl = await getSignedUrl(bucket, path, 60 * 60 * 24 * 30);

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfPath: path, status: "SENT" },
        });

        await sendEmail({
          to: customer.email,
          subject: `Invoice ${invoice.invoiceNumber} from ${business.displayName || business.businessName}`,
          react: React.createElement(InvoiceEmail, {
            invoice,
            business,
            logoUrl,
            downloadUrl,
            recurring: true,
          }) as any,
          replyTo: business.email || undefined,
          attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: buf.toString("base64") }],
        });
        emailSent = true;
      } catch (err) {
        console.error(`[cron/recurring] invoice email failed for schedule ${schedule.id}:`, err);
      }
    }
  } else {
    const quoteNumber = await getNextQuoteNumber(userId);
    const validUntil = td.validDays != null
      ? new Date(now.getTime() + td.validDays * 86400000)
      : null;

    const quote = await prisma.quote.create({
      data: {
        userId,
        customerId: customer.id,
        quoteNumber,
        status: "DRAFT",
        date: now,
        validUntil,
        salesperson: td.salesperson ?? "",
        billingAddress: customer.billingAddress,
        shippingAddress: customer.shippingAddress,
        publicNote: td.publicNote ?? "",
        privateNote: td.privateNote ?? "",
        footerNote: td.footerNote ?? "",
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        lineItems: { create: lineItemsForDb },
      },
      include: { lineItems: { orderBy: { sortOrder: "asc" } }, customer: true },
    });
    generatedQuoteId = quote.id;

    if (schedule.autoSend && customer.email) {
      try {
        const buf = await renderToBuffer(
          React.createElement(QuotePdf, { quote, business, logoUrl }) as any
        );
        const bucket = process.env.SUPABASE_BUCKET_DOCUMENTS!;
        const path = `${userId}/quotes/${quote.id}.pdf`;
        await uploadFile(bucket, path, buf, "application/pdf");
        const downloadUrl = await getSignedUrl(bucket, path, 60 * 60 * 24 * 30);

        await prisma.quote.update({
          where: { id: quote.id },
          data: { pdfPath: path, status: "SENT" },
        });

        await sendEmail({
          to: customer.email,
          subject: `Quote ${quote.quoteNumber} from ${business.displayName || business.businessName}`,
          react: React.createElement(QuoteEmail, {
            quote,
            business,
            logoUrl,
            downloadUrl,
            recurring: true,
          }) as any,
          replyTo: business.email || undefined,
          attachments: [{ filename: `${quote.quoteNumber}.pdf`, content: buf.toString("base64") }],
        });
        emailSent = true;
      } catch (err) {
        console.error(`[cron/recurring] quote email failed for schedule ${schedule.id}:`, err);
      }
    }
  }

  await prisma.recurringGenerated.create({
    data: {
      scheduleId: schedule.id,
      invoiceId: generatedInvoiceId,
      quoteId: generatedQuoteId,
      emailSent,
    },
  });

  const newOccurrencesRun = schedule.occurrencesRun + 1;
  const newNextRunDate = advanceDate(schedule.nextRunDate, schedule.frequency);
  const shouldComplete =
    (schedule.maxOccurrences !== null && newOccurrencesRun >= schedule.maxOccurrences) ||
    (schedule.endDate !== null && newNextRunDate > schedule.endDate);

  await prisma.recurringSchedule.update({
    where: { id: schedule.id },
    data: {
      occurrencesRun: newOccurrencesRun,
      lastRunDate: now,
      nextRunDate: newNextRunDate,
      status: shouldComplete ? "COMPLETED" : "ACTIVE",
    },
  });
}
