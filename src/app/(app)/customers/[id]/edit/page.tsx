import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { CustomerForm } from "@/components/customers/CustomerForm";

export const metadata = { title: "Edit customer — signNGO" };

export default async function EditCustomerPage({
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
  });

  if (!customer || customer.userId !== profile.id) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Edit customer" />
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <CustomerForm mode="edit" initial={customer} />
      </div>
    </div>
  );
}
