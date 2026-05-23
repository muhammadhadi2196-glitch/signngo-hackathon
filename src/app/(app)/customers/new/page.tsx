import { PageHeader } from "@/components/layout/PageHeader";
import { CustomerForm } from "@/components/customers/CustomerForm";

export const metadata = {
  title: "New customer — signNGO",
};

export default function NewCustomerPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New customer"
        description="Add a new customer to your contact list."
      />
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <CustomerForm mode="create" />
      </div>
    </div>
  );
}
