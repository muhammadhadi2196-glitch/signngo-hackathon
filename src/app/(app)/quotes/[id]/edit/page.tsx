import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { QuoteEditor } from "@/components/quotes/QuoteEditor";

export const metadata = { title: "Edit Quote — signNGO" };

export default async function EditQuotePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireUser().catch(() => null);
  if (!session) redirect("/login");

  const { profile } = session;
  const business = profile.businessProfile!;

  const [quote, customers, items, salespeople] = await Promise.all([
    prisma.quote.findUnique({
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

  if (!quote || quote.userId !== profile.id) notFound();

  return (
    <QuoteEditor
      mode="edit"
      quoteId={quote.id}
      initialData={{
        customerId: quote.customerId || "",
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        date: new Date(quote.date).toISOString().split("T")[0],
        validUntil: quote.validUntil
          ? new Date(quote.validUntil).toISOString().split("T")[0]
          : "",
        salesperson: quote.salesperson,
        billingAddress: quote.billingAddress,
        shippingAddress: quote.shippingAddress,
        publicNote: quote.publicNote,
        privateNote: quote.privateNote,
        footerNote: quote.footerNote,
        lineItems: quote.lineItems.map((li) => ({
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
