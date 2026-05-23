import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { InvoiceEditor } from "@/components/invoices/InvoiceEditor";

export const metadata = { title: "Edit Invoice — signNGO" };

export default async function EditInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireUser().catch(() => null);
  if (!session) redirect("/login");

  const { profile } = session;
  const business = profile.businessProfile!;

  const [invoice, customers, items, salespeople] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: params.id },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.customer.findMany({
      where: { userId: profile.id },
      select: { id: true, name: true, email: true, billingAddress: true, shippingAddress: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.item.findMany({
      where: { userId: profile.id },
      select: { id: true, name: true, description: true, unitPrice: true, taxRate: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.salesperson.findMany({
      where: { userId: profile.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      take: 200,
    }),
  ]);

  if (!invoice || invoice.userId !== profile.id) notFound();

  return (
    <InvoiceEditor
      mode="edit"
      invoiceId={invoice.id}
      initialData={{
        customerId: invoice.customerId || "",
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        date: new Date(invoice.date).toISOString().split("T")[0],
        dueDate: invoice.dueDate
          ? new Date(invoice.dueDate).toISOString().split("T")[0]
          : "",
        paymentTerms: invoice.paymentTerms,
        purchaseOrderNumber: invoice.purchaseOrderNumber,
        salesperson: invoice.salesperson,
        billingAddress: invoice.billingAddress,
        shippingAddress: invoice.shippingAddress,
        publicNote: invoice.publicNote,
        privateNote: invoice.privateNote,
        footerNote: invoice.footerNote,
        lineItems: invoice.lineItems.map((li) => ({
          itemId: li.itemId || null,
          quantity: Number(li.quantity),
          name: li.name,
          description: li.description,
          unitPrice: Number(li.unitPrice),
          taxRate: Number(li.taxRate),
          sortOrder: li.sortOrder,
        })),
      }}
      customers={customers}
      items={items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        taxRate: Number(it.taxRate),
      }))}
      salespeople={salespeople.map((s) => ({ id: s.id, name: s.name, isDefault: s.isDefault }))}
      business={{
        displayName: business.displayName,
        businessName: business.businessName,
        address: business.address,
        logoPath: business.logoPath,
      }}
      defaultTaxRate={Number(business.defaultTaxRate)}
    />
  );
}
