import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InvoiceEditor } from "@/components/invoices/InvoiceEditor";

export const metadata = { title: "New Invoice — signNGO" };

export default async function NewInvoicePage() {
  const session = await requireUser().catch(() => null);
  if (!session) redirect("/login");

  const { profile } = session;
  const business = profile.businessProfile!;

  const [customers, items, salespeople] = await Promise.all([
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

  return (
    <InvoiceEditor
      mode="create"
      initialData={{
        paymentTerms: "Net 30",
        salesperson: salespeople.find((s) => s.isDefault)?.name ?? profile.name ?? "",
        footerNote: business.defaultFooter || "",
        date: new Date().toISOString().split("T")[0],
      }}
      customers={customers.map((c) => ({
        ...c,
        unitPrice: 0,
      }))}
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
