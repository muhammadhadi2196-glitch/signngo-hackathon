import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { CustomerDetail } from "@/components/customers/CustomerDetail";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return { title: customer ? `${customer.name} — signNGO` : "Customer — signNGO" };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireUser().catch(() => {
    redirect("/login");
    return Promise.reject();
  });

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 20 },
      quotes: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!customer || customer.userId !== profile.id) notFound();

  return (
    <CustomerDetail
      customer={{
        ...customer,
        invoices: customer.invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          date: inv.date,
          total: Number(inv.total),
        })),
        quotes: customer.quotes.map((q) => ({
          id: q.id,
          quoteNumber: q.quoteNumber,
          status: q.status,
          date: q.date,
          total: Number(q.total),
        })),
      }}
    />
  );
}
