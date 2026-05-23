import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, FileText, Users, BarChart2, Clock } from "lucide-react";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";

export const metadata = { title: "Reports — signNGO" };

type SearchParams = { range?: string; from?: string; to?: string };

interface DateRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
}

function getDateRange(params: SearchParams): DateRange {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const range = params.range ?? "ytd";

  let start: Date;
  let end: Date = new Date(now);

  switch (range) {
    case "this_month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case "last_30":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "last_90":
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "all":
      start = new Date(2000, 0, 1);
      break;
    case "custom":
      start = params.from
        ? new Date(params.from + "T00:00:00")
        : new Date(now.getFullYear(), 0, 1);
      end = params.to ? new Date(params.to + "T23:59:59") : new Date(now);
      break;
    default: // ytd
      start = new Date(now.getFullYear(), 0, 1);
  }

  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);

  return { start, end, prevStart, prevEnd };
}

function fmt(n: unknown): string {
  const num = typeof n === "number" ? n : Number(String(n));
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function daysSince(date: Date | string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function groupByMonth(
  invoices: { total: unknown; date: Date }[],
  start: Date,
  end: Date
): { label: string; value: number }[] {
  const months = new Map<string, number>();
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  // Cap at 12 months — if range is longer, show the 12 most recent
  let displayStart = new Date(startMonth);
  let count = 0;
  const cur = new Date(startMonth);
  while (cur <= endMonth) {
    count++;
    cur.setMonth(cur.getMonth() + 1);
  }
  if (count > 12) {
    displayStart = new Date(end.getFullYear(), end.getMonth() - 11, 1);
  }

  const c = new Date(displayStart);
  while (c <= endMonth) {
    const key = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}`;
    months.set(key, 0);
    c.setMonth(c.getMonth() + 1);
  }

  for (const inv of invoices) {
    const d = new Date(inv.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (months.has(key)) {
      months.set(key, (months.get(key) ?? 0) + Number(String(inv.total)));
    }
  }

  return Array.from(months.entries()).map(([key, val]) => ({
    label: new Date(key + "-15").toLocaleDateString("en-US", { month: "short" }),
    value: val,
  }));
}

function BarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  const barW = 100 / bars.length;
  return (
    <div className="w-full">
      <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="w-full h-10">
        {bars.map((b, i) => {
          const h = Math.max((b.value / max) * 32, b.value > 0 ? 1 : 0);
          return (
            <rect
              key={i}
              x={i * barW + barW * 0.12}
              y={36 - h}
              width={barW * 0.76}
              height={h}
              rx="0.8"
              fill="#3b82f6"
              fillOpacity={0.75}
            />
          );
        })}
      </svg>
      <div className="flex mt-0.5">
        {bars.map((b, i) => (
          <span
            key={i}
            className="flex-1 text-center leading-none"
            style={{ fontSize: "9px", color: "#94a3b8" }}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    SENT: { bg: "bg-blue-100", text: "text-blue-700", label: "Sent" },
    VIEWED: { bg: "bg-purple-100", text: "text-purple-700", label: "Viewed" },
    OVERDUE: { bg: "bg-red-100", text: "text-red-700", label: "Overdue" },
    DRAFT: { bg: "bg-slate-100", text: "text-slate-600", label: "Draft" },
    PAID: { bg: "bg-green-100", text: "text-green-700", label: "Paid" },
  };
  const s = map[status] ?? { bg: "bg-slate-100", text: "text-slate-600", label: status };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireUser().catch(() => null);
  if (!session) redirect("/login");

  const { profile } = session;
  const { start, end, prevStart, prevEnd } = getDateRange(searchParams);

  const [
    paidInvoices,
    prevPaidInvoices,
    outstandingInvoices,
    customerRevenueInvoices,
    quotesInRange,
    signingInRange,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId: profile.id, status: "PAID", date: { gte: start, lte: end } },
      select: { total: true, date: true },
      take: 500,
    }),
    prisma.invoice.findMany({
      where: { userId: profile.id, status: "PAID", date: { gte: prevStart, lte: prevEnd } },
      select: { total: true },
      take: 500,
    }),
    prisma.invoice.findMany({
      where: { userId: profile.id, status: { in: ["SENT", "VIEWED", "OVERDUE"] } },
      select: {
        id: true,
        total: true,
        date: true,
        invoiceNumber: true,
        status: true,
        customer: { select: { name: true } },
      },
      orderBy: { date: "asc" },
      take: 200,
    }),
    prisma.invoice.findMany({
      where: {
        userId: profile.id,
        status: "PAID",
        date: { gte: start, lte: end },
        customerId: { not: null },
      },
      select: {
        total: true,
        customerId: true,
        customer: { select: { name: true } },
      },
      take: 500,
    }),
    prisma.quote.findMany({
      where: { userId: profile.id, date: { gte: start, lte: end } },
      select: { status: true },
      take: 500,
    }),
    prisma.signingRequest.findMany({
      where: { userId: profile.id, createdAt: { gte: start, lte: end } },
      select: { status: true },
      take: 500,
    }),
  ]);

  // ── Revenue ──────────────────────────────────────────────────────────────────
  const totalRevenue = paidInvoices.reduce((s, i) => s + Number(String(i.total)), 0);
  const prevRevenue = prevPaidInvoices.reduce((s, i) => s + Number(String(i.total)), 0);
  const outstandingRevenue = outstandingInvoices.reduce(
    (s, i) => s + Number(String(i.total)),
    0
  );
  const trendPct =
    prevRevenue === 0 ? null : ((totalRevenue - prevRevenue) / prevRevenue) * 100;
  const monthlyBars = groupByMonth(paidInvoices, start, end);

  // ── Top customers ─────────────────────────────────────────────────────────────
  const customerMap = new Map<string, { name: string; total: number; count: number }>();
  for (const inv of customerRevenueInvoices) {
    if (!inv.customerId || !inv.customer) continue;
    const existing = customerMap.get(inv.customerId) ?? {
      name: inv.customer.name,
      total: 0,
      count: 0,
    };
    existing.total += Number(String(inv.total));
    existing.count += 1;
    customerMap.set(inv.customerId, existing);
  }
  const topCustomers = Array.from(customerMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // ── Quote activity ────────────────────────────────────────────────────────────
  const quotesSent = quotesInRange.filter((q) => q.status !== "DRAFT").length;
  const quotesAccepted = quotesInRange.filter(
    (q) => q.status === "ACCEPTED" || q.status === "CONVERTED"
  ).length;
  const quoteRate = quotesSent === 0 ? null : (quotesAccepted / quotesSent) * 100;

  // ── Signing activity ──────────────────────────────────────────────────────────
  const signingsSent = signingInRange.filter((s) => s.status !== "DRAFT").length;
  const signingsCompleted = signingInRange.filter((s) => s.status === "COMPLETED").length;
  const signingRate = signingsSent === 0 ? null : (signingsCompleted / signingsSent) * 100;

  const top5Outstanding = outstandingInvoices.slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Insights across your business</p>
        </div>
        <DateRangeFilter
          range={searchParams.range ?? "ytd"}
          from={searchParams.from}
          to={searchParams.to}
        />
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Card 1: Revenue Snapshot ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Revenue Snapshot
            </h2>
          </div>

          {totalRevenue === 0 && paidInvoices.length === 0 ? (
            <div className="py-10 text-center space-y-1">
              <p className="text-sm text-slate-400">No revenue recorded in this period.</p>
              <Link
                href="/invoices/new"
                className="text-xs text-blue-600 hover:underline"
              >
                Create your first invoice →
              </Link>
            </div>
          ) : (
            <>
              <div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">
                  {fmt(totalRevenue)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Total paid revenue</p>
                {trendPct !== null && (
                  <div
                    className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${
                      trendPct > 0
                        ? "text-green-600"
                        : trendPct < 0
                        ? "text-red-600"
                        : "text-slate-500"
                    }`}
                  >
                    {trendPct > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : trendPct < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    {trendPct > 0 ? "+" : ""}
                    {trendPct.toFixed(1)}% vs previous period
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1.5">Monthly revenue</p>
                <BarChart bars={monthlyBars} />
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <span className="text-sm text-slate-500">Outstanding (all time)</span>
                <span className="text-sm font-semibold text-amber-600 tabular-nums">
                  {fmt(outstandingRevenue)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── Card 2: Outstanding Invoices ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding Invoices
            </h2>
          </div>

          {outstandingInvoices.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400">
                No outstanding invoices — you&apos;re all caught up.
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-8">
                <div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">
                    {outstandingInvoices.length}
                  </p>
                  <p className="text-xs text-slate-500">Unpaid invoices</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600 tabular-nums">
                    {fmt(outstandingRevenue)}
                  </p>
                  <p className="text-xs text-slate-500">Total owed</p>
                </div>
              </div>

              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs min-w-[360px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-1.5 px-1 font-medium text-slate-400">
                        Customer
                      </th>
                      <th className="text-left py-1.5 px-1 font-medium text-slate-400">
                        Invoice
                      </th>
                      <th className="text-right py-1.5 px-1 font-medium text-slate-400">
                        Amount
                      </th>
                      <th className="text-right py-1.5 px-1 font-medium text-slate-400">
                        Days
                      </th>
                      <th className="text-right py-1.5 px-1 font-medium text-slate-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {top5Outstanding.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 px-1 text-slate-700 max-w-[100px] truncate">
                          {inv.customer?.name ?? "—"}
                        </td>
                        <td className="py-2 px-1 text-slate-500">{inv.invoiceNumber}</td>
                        <td className="py-2 px-1 text-right font-medium text-slate-800 tabular-nums">
                          {fmt(inv.total)}
                        </td>
                        <td className="py-2 px-1 text-right text-slate-400">
                          {daysSince(inv.date)}d
                        </td>
                        <td className="py-2 px-1 text-right">
                          <StatusBadge status={inv.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Link
                href="/invoices?status=sent"
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                View all outstanding →
              </Link>
            </>
          )}
        </div>

        {/* ── Card 3: Top Customers by Revenue ─────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Top Customers by Revenue
            </h2>
          </div>

          {topCustomers.length === 0 ? (
            <div className="py-10 text-center space-y-1">
              <p className="text-sm text-slate-400">
                No customer revenue in this period.
              </p>
              <p className="text-xs text-slate-400">
                Paid invoices linked to a customer will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-300 w-4 shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400">
                        {c.count} invoice{c.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">
                      {fmt(c.total)}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/customers"
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                View all customers →
              </Link>
            </>
          )}
        </div>

        {/* ── Card 4: Document Activity ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Document Activity
            </h2>
          </div>

          {quotesSent === 0 && signingsSent === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400">No document activity in this period.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Quotes section */}
              {quotesSent > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Quotes
                  </p>
                  <div className="flex gap-6 mb-3">
                    <div>
                      <p className="text-xl font-bold text-slate-900 tabular-nums">
                        {quotesSent}
                      </p>
                      <p className="text-xs text-slate-500">Sent</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-green-600 tabular-nums">
                        {quotesAccepted}
                      </p>
                      <p className="text-xs text-slate-500">Accepted</p>
                    </div>
                    {quoteRate !== null && (
                      <div>
                        <p className="text-xl font-bold text-blue-600 tabular-nums">
                          {quoteRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500">Acceptance rate</p>
                      </div>
                    )}
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: `${Math.min((quotesAccepted / quotesSent) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {quotesSent > 0 && signingsSent > 0 && (
                <div className="border-t border-slate-100" />
              )}

              {/* Signing section */}
              {signingsSent > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Signing Requests
                  </p>
                  <div className="flex gap-6 mb-3">
                    <div>
                      <p className="text-xl font-bold text-slate-900 tabular-nums">
                        {signingsSent}
                      </p>
                      <p className="text-xs text-slate-500">Sent</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-green-600 tabular-nums">
                        {signingsCompleted}
                      </p>
                      <p className="text-xs text-slate-500">Completed</p>
                    </div>
                    {signingRate !== null && (
                      <div>
                        <p className="text-xl font-bold text-blue-600 tabular-nums">
                          {signingRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500">Completion rate</p>
                      </div>
                    )}
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: `${Math.min((signingsCompleted / signingsSent) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
