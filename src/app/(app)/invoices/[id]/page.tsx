import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceView } from "@/components/invoices/InvoiceView";
import { MakeRecurringButton } from "@/components/recurring/MakeRecurringButton";

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: "Invoice — signNGO" };
}

export default async function InvoiceViewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireUser().catch(() => null);
  if (!session) redirect("/login");

  const { profile } = session;

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      customer: true,
    },
  });

  if (!invoice || invoice.userId !== profile.id) notFound();

  const business = profile.businessProfile!;
  const invoiceData = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    date: invoice.date.toISOString(),
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
    paymentTerms: invoice.paymentTerms,
    purchaseOrderNumber: invoice.purchaseOrderNumber,
    salesperson: invoice.salesperson,
    billingAddress: invoice.billingAddress,
    shippingAddress: invoice.shippingAddress,
    publicNote: invoice.publicNote,
    footerNote: invoice.footerNote,
    subtotal: Number(invoice.subtotal),
    taxTotal: Number(invoice.taxTotal),
    total: Number(invoice.total),
    balance: Number(invoice.balance),
    lineItems: invoice.lineItems.map((li) => ({
      id: li.id,
      name: li.name,
      description: li.description,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      taxRate: Number(li.taxRate),
      lineTotal: Number(li.lineTotal),
    })),
    customer: invoice.customer
      ? { id: invoice.customer.id, name: invoice.customer.name, email: invoice.customer.email }
      : null,
  };

  const daysUntilDue = invoice.dueDate
    ? Math.round((invoice.dueDate.getTime() - invoice.date.getTime()) / 86400000)
    : invoice.paymentTerms.match(/\d+/)
    ? Number(invoice.paymentTerms.match(/\d+/)![0])
    : 30;

  const recurringTemplate = {
    lineItems: invoice.lineItems.map((li, i) => ({
      name: li.name,
      description: li.description,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      taxRate: Number(li.taxRate),
      sortOrder: li.sortOrder ?? i,
    })),
    publicNote: invoice.publicNote,
    privateNote: invoice.privateNote,
    footerNote: invoice.footerNote,
    paymentTerms: invoice.paymentTerms,
    purchaseOrderNumber: invoice.purchaseOrderNumber,
    salesperson: invoice.salesperson,
    daysUntilDue,
  };

  return (
    <div>
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        action={
          <div className="flex items-center gap-2">
            <MakeRecurringButton
              type="INVOICE"
              customerId={invoice.customerId}
              templateData={recurringTemplate}
            />
            <Link
              href={`/invoices/${invoice.id}/edit`}
              className="inline-flex items-center justify-center gap-2 font-medium rounded-md h-9 px-4 text-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Edit
            </Link>
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 font-medium rounded-md h-9 px-4 text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              Download PDF
            </a>
          </div>
        }
      />
      <InvoiceView invoice={invoiceData} business={{
        displayName: business.displayName,
        businessName: business.businessName,
        address: business.address,
        taxNumber: business.taxNumber,
        defaultFooter: business.defaultFooter,
      }} />
    </div>
  );
}
