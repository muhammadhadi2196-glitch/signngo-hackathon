import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { SigningRequestEmail } from "@/lib/email/templates/SigningRequestEmail";
import { getPublicUrl } from "@/lib/storage/supabaseStorage";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const sr = await prisma.signingRequest.findUnique({
      where: { id: params.id },
      include: { document: true, fields: true },
    });
    if (!sr || sr.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (sr.fields.length === 0) {
      return NextResponse.json(
        { error: "Add at least one field before sending" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const signingUrl = `${baseUrl}/sign/${sr.token}`;
    const business = profile.businessProfile!;
    const logoUrl = business.logoPath
      ? getPublicUrl(process.env.SUPABASE_BUCKET_LOGOS!, business.logoPath)
      : null;
    const senderName =
      business.displayName || business.businessName || profile.name;

    await prisma.signingRequest.update({
      where: { id: sr.id },
      data: { status: "SENT" },
    });
    await prisma.auditEvent.create({
      data: {
        signingRequestId: sr.id,
        type: "SENT",
        metadataJson: JSON.stringify({ to: sr.recipientEmail }),
      },
    });

    let emailSent = false;
    try {
      await sendEmail({
        to: sr.recipientEmail,
        subject: `${senderName} needs your signature`,
        react: SigningRequestEmail({
          recipientName: sr.recipientName,
          senderName,
          documentTitle: sr.document.title,
          signingUrl,
          logoUrl,
          expiresAt: sr.expiresAt,
        }),
        replyTo: business.email || undefined,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("Email send failed (non-fatal):", emailErr);
    }

    return NextResponse.json({ ok: true, emailSent, signingUrl });
  } catch (e: any) {
    console.error("Send error:", e);
    return NextResponse.json({ error: e?.message || "Send failed" }, { status: 500 });
  }
}
