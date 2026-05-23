import { PageHeader } from "@/components/layout/PageHeader";
import { ItemsList } from "@/components/items/ItemsList";

export const metadata = {
  title: "Items & services — signNGO",
};

export default function ItemsPage() {
  return (
    <div>
      <PageHeader
        title="Items & services"
        description="Reusable products and services for quick invoice line items."
      />
      <ItemsList />
    </div>
  );
}
