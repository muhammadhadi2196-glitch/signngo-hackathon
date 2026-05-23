import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getSignedUrl } from "@/lib/storage/supabaseStorage";
import { PDFBuilder } from "@/components/builder/PDFBuilder";
import type { FieldType, FieldAssignee } from "@/components/builder/PDFBuilder";

export const metadata = { title: "Prepare document — signNGO" };

export default async function BuilderPage({
  params,
}: {
  params: { requestId: string };
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const sr = await prisma.signingRequest.findUnique({
    where: { id: params.requestId },
    include: {
      document: true,
      fields: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!sr || sr.userId !== session.profile.id) notFound();

  const pdfUrl = await getSignedUrl(
    process.env.SUPABASE_BUCKET_DOCUMENTS!,
    sr.document.storagePath,
    60 * 60 * 2
  );

  const business = session.profile.businessProfile;
  const senderName =
    business?.displayName || business?.businessName || session.profile.name;

  const initialFields = sr.fields.map((f) => ({
    id: f.id,
    page: f.page,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    type: f.type as FieldType,
    label: f.label,
    required: f.required,
    assignedTo: f.assignedTo as FieldAssignee,
    prefilledValue: f.prefilledValue ?? null,
    prefilledImagePath: f.prefilledImagePath ?? null,
  }));

  return (
    <PDFBuilder
      requestId={sr.id}
      documentTitle={sr.document.title}
      pageCount={sr.document.pageCount || 1}
      pdfUrl={pdfUrl}
      recipientName={sr.recipientName}
      recipientEmail={sr.recipientEmail}
      senderName={senderName}
      initialFields={initialFields}
      status={sr.status as string}
    />
  );
}
