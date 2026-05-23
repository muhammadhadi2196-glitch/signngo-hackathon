import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BusinessProfileForm } from "@/components/settings/BusinessProfileForm";
import { SalespeopleSettings } from "@/components/settings/SalespeopleSettings";
import { getPublicUrl } from "@/lib/storage/supabaseStorage";

export const metadata = {
  title: "Business settings — signNGO",
};

export default async function BusinessSettingsPage() {
  const { profile } = await requireUser().catch(() => {
    redirect("/login");
    return Promise.reject();
  });

  const bp = profile.businessProfile!;
  const logoPublicUrl = bp.logoPath
    ? getPublicUrl(process.env.SUPABASE_BUCKET_LOGOS ?? "logos", bp.logoPath)
    : null;

  return (
    <>
      <BusinessProfileForm
        initial={{
          businessName: bp.businessName,
          displayName: bp.displayName,
          address: bp.address,
          phone: bp.phone,
          email: bp.email,
          website: bp.website,
          taxNumber: bp.taxNumber,
          defaultTaxRate: Number(bp.defaultTaxRate),
          defaultInvoiceNote: bp.defaultInvoiceNote,
          defaultQuoteNote: bp.defaultQuoteNote,
          defaultFooter: bp.defaultFooter,
          defaultPaymentTerms: bp.defaultPaymentTerms,
          invoiceNumberPrefix: bp.invoiceNumberPrefix,
          quoteNumberPrefix: bp.quoteNumberPrefix,
          nextInvoiceNumber: bp.nextInvoiceNumber,
          nextQuoteNumber: bp.nextQuoteNumber,
          brandColor: bp.brandColor,
        }}
        logoPublicUrl={logoPublicUrl}
      />
      <SalespeopleSettings />
    </>
  );
}
