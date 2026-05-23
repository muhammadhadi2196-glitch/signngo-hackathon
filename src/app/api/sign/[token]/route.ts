import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedUrl } from "@/lib/storage/supabaseStorage";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const sr = await prisma.signingRequest.findUnique({
    where: { token: params.token },
    include: {
      document: {
        select: { id: true, title: true, storagePath: true, pageCount: true },
      },
      fields: true,
      user: {
        select: {
          name: true,
          businessProfile: {
            select: { businessName: true, displayName: true, logoPath: true },
          },
        },
      },
    },
  });

  if (!sr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sr.expiresAt && sr.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }
  if (sr.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Already signed", status: "COMPLETED" },
      { status: 409 }
    );
  }

  const pdfUrl = await getSignedUrl(
    process.env.SUPABASE_BUCKET_DOCUMENTS!,
    sr.document.storagePath,
    60 * 60
  );

  return NextResponse.json({
    request: {
      id: sr.id,
      recipientName: sr.recipientName,
      recipientEmail: sr.recipientEmail,
      status: sr.status,
      fields: sr.fields,
    },
    document: {
      id: sr.document.id,
      title: sr.document.title,
      pageCount: sr.document.pageCount,
      pdfUrl,
    },
    sender: {
      businessName:
        sr.user.businessProfile?.displayName ||
        sr.user.businessProfile?.businessName ||
        sr.user.name,
      logoPath: sr.user.businessProfile?.logoPath || null,
    },
  });
}
