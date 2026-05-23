import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { FileText, Receipt, Users, ArrowRight, Quote, PenLine } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Dashboard — signNGO",
};

export default async function DashboardPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { authUser, profile } = session;
  const name =
    profile.name?.split(" ")[0] ??
    authUser.email?.split("@")[0] ??
    "there";

  const profileIncomplete = !profile.businessProfile?.businessName;

  const [invoiceCount, quoteCount, customerCount, outstanding, docsSent, awaitingSig] =
    await Promise.all([
      prisma.invoice.count({ where: { userId: profile.id } }),
      prisma.quote.count({ where: { userId: profile.id } }),
      prisma.customer.count({ where: { userId: profile.id } }),
      prisma.invoice.aggregate({
        where: { userId: profile.id, status: { in: ["SENT", "OVERDUE"] } },
        _sum: { balance: true },
      }),
      prisma.signingRequest.count({ where: { userId: profile.id, status: { not: "DRAFT" } } }),
      prisma.signingRequest.count({ where: { userId: profile.id, status: { in: ["SENT", "VIEWED"] } } }),
    ]);

  const outstandingTotal = Number(outstanding._sum.balance || 0);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${name}`}
        description="Here's a quick overview of your account."
      />

      {/* Account setup nudge */}
      {profileIncomplete && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-5 w-5 rounded-full border-2 border-blue-400 flex items-center justify-center shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Set up your business profile
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Add your business name, logo, and tax number so they appear on invoices.
              </p>
            </div>
          </div>
          <Link
            href="/settings/business"
            className="flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900 shrink-0"
          >
            Go <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        <StatCard label="Invoices" value={invoiceCount} href="/invoices" />
        <StatCard label="Quotes" value={quoteCount} href="/quotes" />
        <StatCard
          label="Outstanding"
          value={outstandingTotal.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          })}
          href="/invoices?status=SENT"
        />
        <StatCard label="Customers" value={customerCount} href="/customers" />
        <StatCard label="Docs sent" value={docsSent} href="/documents" />
        <StatCard label="Awaiting sig." value={awaitingSig} href="/documents" />
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickLink
          href="/documents/new"
          icon={<FileText className="h-5 w-5" />}
          title="Send a document for signing"
          description="Upload a PDF and add signature fields"
        />
        <QuickLink
          href="/invoices/new"
          icon={<Receipt className="h-5 w-5" />}
          title="Create an invoice"
          description="Send a professional invoice to a client"
        />
        <QuickLink
          href="/quotes/new"
          icon={<Quote className="h-5 w-5" />}
          title="Create a quote"
          description="Send a quote and convert to invoice on acceptance"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors"
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-3xl font-semibold text-slate-900 tabular-nums mt-1">
        {value}
      </p>
    </Link>
  );
}

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 transition-colors"
    >
      <div className="text-blue-600">{icon}</div>
      <div>
        <p className="font-medium text-slate-900 group-hover:text-blue-700 text-sm">
          {title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </Link>
  );
}
