import { PageHeader } from "@/components/layout/PageHeader";
import { CustomersList } from "@/components/customers/CustomersList";
import Link from "next/link";
import { cn } from "@/lib/cn";

export const metadata = {
  title: "Customers — signNGO",
};

export default function CustomersPage() {
  return (
    <div>
      <PageHeader
        title="Customers"
        action={
          <Link
            href="/customers/new"
            className={cn(
              "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors",
              "h-9 px-4 text-sm bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            + New customer
          </Link>
        }
      />
      <CustomersList />
    </div>
  );
}
