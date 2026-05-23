import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuoteView } from "@/components/quotes/QuoteView";
import { MakeRecurringButton } from "@/components/recurring/MakeRecurringButton";

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: "Quote — signNGO" };
}

export default async function QuoteViewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireUser().catch(() => null);
  if (!session) redirect("/login");

  const { profile } = session;

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      customer: true,
    },
  });

  if (!quote || quote.userId !== profile.id) notFound();

  const business = profile.businessProfile!;
  const quoteData = {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    date: quote.date.toISOString(),
    validUntil: quote.validUntil ? quote.validUntil.toISOString() : null,
    salesperson: quote.salesperson,
    billingAddress: quote.billingAddress,
    shippingAddress: quote.shippingAddress,
    publicNote: quote.publicNote,
    footerNote: quote.footerNote,
    subtotal: Number(quote.subtotal),
    taxTotal: Number(quote.taxTotal),
    total: Number(quote.total),
    convertedToInvoiceId: quote.convertedToInvoiceId,
    lineItems: quote.lineItems.map((li) => ({
      id: li.id,
      name: li.name,
      description: li.description,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      taxRate: Number(li.taxRate),
      lineTotal: Number(li.lineTotal),
    })),
    customer: quote.customer
      ? { id: quote.customer.id, name: quote.customer.name, email: quote.customer.email }
      : null,
  };

  const validDays = quote.validUntil
    ? Math.round((quote.validUntil.getTime() - quote.date.getTime()) / 86400000)
    : 30;

  const recurringTemplate = {
    lineItems: quote.lineItems.map((li, i) => ({
      name: li.name,
      description: li.description,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      taxRate: Number(li.taxRate),
      sortOrder: li.sortOrder ?? i,
    })),
    publicNote: quote.publicNote,
    privateNote: quote.privateNote,
    footerNote: quote.footerNote,
    salesperson: quote.salesperson,
    validDays,
  };

  return (
    <div>
      <PageHeader
        title={`Quote ${quote.quoteNumber}`}
        action={
          <div className="flex items-center gap-2">
            <MakeRecurringButton
              type="QUOTE"
              customerId={quote.customerId}
              templateData={recurringTemplate}
            />
            <Link
              href={`/quotes/${quote.id}/edit`}
              className="inline-flex items-center justify-center gap-2 font-medium rounded-md h-9 px-4 text-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Edit
            </Link>
            <a
              href={`/api/quotes/${quote.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 font-medium rounded-md h-9 px-4 text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              Download PDF
            </a>
          </div>
        }
      />
      <QuoteView quote={quoteData} business={{
        displayName: business.displayName,
        businessName: business.businessName,
        address: business.address,
        taxNumber: business.taxNumber,
        defaultFooter: business.defaultFooter,
      }} />
    </div>
  );
}
