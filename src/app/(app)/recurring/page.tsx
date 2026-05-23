import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecurringList } from "@/components/recurring/RecurringList";

export const metadata = { title: "Recurring Schedules — signNGO" };

export default async function RecurringPage() {
  const session = await requireUser().catch(() => null);
  if (!session) redirect("/login");

  const { profile } = session;

  const raw = await prisma.recurringSchedule.findMany({
    where: { userId: profile.id },
    include: {
      customer: { select: { id: true, name: true } },
      _count: { select: { generatedItems: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const schedules = raw.map((s) => ({
    id: s.id,
    type: s.type,
    frequency: s.frequency,
    status: s.status,
    autoSend: s.autoSend,
    nextRunDate: s.nextRunDate.toISOString(),
    lastRunDate: s.lastRunDate ? s.lastRunDate.toISOString() : null,
    occurrencesRun: s.occurrencesRun,
    maxOccurrences: s.maxOccurrences,
    customer: s.customer,
    generatedCount: s._count.generatedItems,
  }));

  return (
    <div>
      <PageHeader
        title="Recurring Schedules"
        description="Auto-generate invoices and quotes on a schedule."
      />
      <RecurringList schedules={schedules} />
    </div>
  );
}
