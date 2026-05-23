import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuotesList } from "@/components/quotes/QuotesList";

export const metadata = { title: "Quotes — signNGO" };

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const session = await requireUser().catch(() => null);
  if (!session) redirect("/login");

  const { profile } = session;
  const status = searchParams.status;
  const q = (searchParams.q || "").trim();

  const raw = await prisma.quote.findMany({
    where: {
      userId: profile.id,
      ...(status ? { status: status as any } : {}),
      ...(q
        ? {
            OR: [
              { quoteNumber: { contains: q, mode: "insensitive" } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const quotes = raw.map((q) => ({
    id: q.id,
    quoteNumber: q.quoteNumber,
    status: q.status,
    date: q.date.toISOString(),
    validUntil: q.validUntil ? q.validUntil.toISOString() : null,
    total: Number(q.total),
    customer: q.customer,
  }));

  return (
    <div>
      <PageHeader
        title="Quotes"
        description="Manage and send quotes to your customers."
        action={
          <Link
            href="/quotes/new"
            className="inline-flex items-center justify-center gap-2 font-medium rounded-md h-9 px-4 text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            + New quote
          </Link>
        }
      />
      <QuotesList quotes={quotes} activeStatus={status} query={q} />
    </div>
  );
}
