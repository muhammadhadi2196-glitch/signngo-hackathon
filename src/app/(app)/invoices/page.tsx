import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoicesList } from "@/components/invoices/InvoicesList";

export const metadata = { title: "Invoices — signNGO" };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const session = await requireUser().catch(() => null);
  if (!session) redirect("/login");

  const { profile } = session;
  const status = searchParams.status;
  const q = (searchParams.q || "").trim();

  const raw = await prisma.invoice.findMany({
    where: {
      userId: profile.id,
      ...(status ? { status: status as any } : {}),
      ...(q
        ? {
            OR: [
              { invoiceNumber: { contains: q, mode: "insensitive" } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const invoices = raw.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    date: inv.date.toISOString(),
    dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
    total: Number(inv.total),
    customer: inv.customer,
  }));

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Manage and send invoices to your customers."
        action={
          <Link
            href="/invoices/new"
            className="inline-flex items-center justify-center gap-2 font-medium rounded-md h-9 px-4 text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            + New invoice
          </Link>
        }
      />
      <InvoicesList
        invoices={invoices}
        activeStatus={status}
        query={q}
      />
    </div>
  );
}
