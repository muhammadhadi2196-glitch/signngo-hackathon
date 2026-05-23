import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecurringDetail } from "@/components/recurring/RecurringDetail";

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: "Recurring Schedule — signNGO" };
}

export default async function RecurringDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireUser().catch(() => null);
  if (!session) redirect("/login");

  const { profile } = session;

  const schedule = await prisma.recurringSchedule.findUnique({
    where: { id: params.id },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      generatedItems: { orderBy: { generatedAt: "desc" } },
    },
  });

  if (!schedule || schedule.userId !== profile.id) notFound();

  // Join generated items with their invoice or quote records
  const invoiceIds = schedule.generatedItems
    .map((g) => g.invoiceId)
    .filter((id): id is string => !!id);
  const quoteIds = schedule.generatedItems
    .map((g) => g.quoteId)
    .filter((id): id is string => !!id);

  const [invoiceMap, quoteMap] = await Promise.all([
    invoiceIds.length
      ? prisma.invoice
          .findMany({
            where: { id: { in: invoiceIds } },
            select: { id: true, invoiceNumber: true, status: true, total: true, date: true },
          })
          .then((rows) => Object.fromEntries(rows.map((r) => [r.id, r])))
      : Promise.resolve({} as Record<string, { id: string; invoiceNumber: string; status: string; total: unknown; date: Date }>),
    quoteIds.length
      ? prisma.quote
          .findMany({
            where: { id: { in: quoteIds } },
            select: { id: true, quoteNumber: true, status: true, total: true, date: true },
          })
          .then((rows) => Object.fromEntries(rows.map((r) => [r.id, r])))
      : Promise.resolve({} as Record<string, { id: string; quoteNumber: string; status: string; total: unknown; date: Date }>),
  ]);

  const generatedItems = schedule.generatedItems.map((g) => {
    const inv = g.invoiceId ? invoiceMap[g.invoiceId] : null;
    const qt = g.quoteId ? quoteMap[g.quoteId] : null;
    return {
      id: g.id,
      generatedAt: g.generatedAt.toISOString(),
      emailSent: g.emailSent,
      invoice: inv
        ? { id: inv.id, number: inv.invoiceNumber, status: inv.status, total: Number(inv.total), date: inv.date.toISOString() }
        : null,
      quote: qt
        ? { id: qt.id, number: qt.quoteNumber, status: qt.status, total: Number(qt.total), date: qt.date.toISOString() }
        : null,
    };
  });

  const data = {
    id: schedule.id,
    type: schedule.type,
    frequency: schedule.frequency,
    status: schedule.status,
    autoSend: schedule.autoSend,
    startDate: schedule.startDate.toISOString(),
    endDate: schedule.endDate ? schedule.endDate.toISOString() : null,
    nextRunDate: schedule.nextRunDate.toISOString(),
    lastRunDate: schedule.lastRunDate ? schedule.lastRunDate.toISOString() : null,
    occurrencesRun: schedule.occurrencesRun,
    maxOccurrences: schedule.maxOccurrences,
    templateData: schedule.templateData as Record<string, unknown>,
    customer: schedule.customer,
    generatedItems,
  };

  return (
    <div>
      <PageHeader
        title={`Recurring ${schedule.type === "INVOICE" ? "Invoice" : "Quote"}`}
        description={schedule.customer?.name ?? undefined}
      />
      <RecurringDetail schedule={data} />
    </div>
  );
}
