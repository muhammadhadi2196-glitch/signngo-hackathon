import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { uploadFile, getSignedUrl, getPublicUrl } from "@/lib/storage/supabaseStorage";
import { sendEmail } from "@/lib/email/send";
import { DocumentCompletedEmail } from "@/lib/email/templates/DocumentCompletedEmail";
import { z } from "zod";

const bodySchema = z.object({
  values: z.record(z.string(), z.union([z.string(), z.boolean()])),
  signatureDataUrls: z.record(z.string(), z.string()).default({}),
});

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const sr = await prisma.signingRequest.findUnique({
      where: { token: params.token },
      include: {
        document: true,
        fields: true,
        user: { include: { businessProfile: true } },
      },
    });
    if (!sr) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (sr.status === "COMPLETED") {
      const downloadUrl = sr.completedFilePath
        ? await getSignedUrl(process.env.SUPABASE_BUCKET_SIGNED!, sr.completedFilePath, 60 * 60 * 24 * 30)
        : null;
      return NextResponse.json({ ok: true, alreadyCompleted: true, downloadUrl });
    }
    if (sr.expiresAt && sr.expiresAt < new Date()) return NextResponse.json({ error: "Expired" }, { status: 410 });

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    // Validate required RECIPIENT fields
    for (const f of sr.fields) {
      if (f.assignedTo === "SENDER" || !f.required) continue;
      if (f.type === "CHECKBOX") {
        if (parsed.data.values[f.id] !== true) {
          return NextResponse.json({ error: `Field "${f.label || f.type}" is required` }, { status: 400 });
        }
      } else if (f.type === "SIGNATURE" || f.type === "INITIALS") {
        if (!parsed.data.signatureDataUrls[f.id]) {
          return NextResponse.json({ error: `Signature required for "${f.label || "field"}"` }, { status: 400 });
        }
      } else {
        const v = parsed.data.values[f.id];
        if (!v || (typeof v === "string" && v.trim() === "")) {
          return NextResponse.json({ error: `Field "${f.label || f.type}" is required` }, { status: 400 });
        }
      }
    }

    // Download original PDF
    const origUrl = await getSignedUrl(process.env.SUPABASE_BUCKET_DOCUMENTS!, sr.document.storagePath, 60);
    const origRes = await fetch(origUrl);
    const origBytes = new Uint8Array(await origRes.arrayBuffer());

    const pdfDoc = await PDFDocument.load(origBytes);
    const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Stamp ALL fields — sender pre-fills + recipient fills
    for (const f of sr.fields) {
      const page = pdfDoc.getPages()[f.page - 1];
      if (!page) continue;

      // Use the full MediaBox rectangle so origin offsets are handled correctly.
      // f.x/y/width/height are fractions (0–1) relative to the rendered page.
      // PDF y=0 is at the bottom, browser y=0 is at the top — flip accordingly.
      const mb = page.getMediaBox();
      const fx = mb.x + f.x * mb.width;
      const fw = f.width * mb.width;
      const fh = f.height * mb.height;
      const fy = mb.y + mb.height - f.y * mb.height - fh;

      if (f.assignedTo === "SENDER") {
        // Stamp sender pre-fills
        const isSig = f.type === "SIGNATURE" || f.type === "INITIALS";
        if (isSig && f.prefilledImagePath) {
          try {
            const imgUrl = await getSignedUrl(process.env.SUPABASE_BUCKET_SIGNED!, f.prefilledImagePath, 60);
            const imgRes = await fetch(imgUrl);
            const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
            const png = await pdfDoc.embedPng(imgBytes);
            page.drawImage(png, { x: fx, y: fy, width: fw, height: fh });
          } catch {}
        } else if (f.type === "CHECKBOX") {
          if (f.prefilledValue === "true") {
            page.drawText("✓", { x: fx + 2, y: fy + 2, size: Math.min(fh - 4, 14), font: helv, color: rgb(0, 0, 0) });
          }
        } else if (f.prefilledValue) {
          page.drawText(f.prefilledValue, {
            x: fx + 2, y: fy + fh / 2 - 5, size: Math.min(fh - 4, 11),
            font: helv, color: rgb(0.06, 0.09, 0.16), maxWidth: fw - 4,
          });
        }
      } else {
        // Stamp recipient fills
        if (f.type === "SIGNATURE" || f.type === "INITIALS") {
          const dataUrl = parsed.data.signatureDataUrls[f.id];
          if (!dataUrl) continue;
          const base64 = dataUrl.split(",")[1] || "";
          const imgBytes = Buffer.from(base64, "base64");
          const png = await pdfDoc.embedPng(imgBytes);
          page.drawImage(png, { x: fx, y: fy, width: fw, height: fh });
        } else if (f.type === "CHECKBOX") {
          if (parsed.data.values[f.id] === true) {
            page.drawText("✓", { x: fx + 2, y: fy + 2, size: Math.min(fh - 4, 14), font: helv, color: rgb(0, 0, 0) });
          }
        } else {
          const text = String(parsed.data.values[f.id] ?? "");
          if (text) {
            page.drawText(text, {
              x: fx + 2, y: fy + fh / 2 - 5, size: Math.min(fh - 4, 11),
              font: helv, color: rgb(0.06, 0.09, 0.16), maxWidth: fw - 4,
            });
          }
        }
      }
    }

    // Audit page
    const auditPage = pdfDoc.addPage();
    const { width: aw, height: ah } = auditPage.getSize();
    auditPage.drawText("signNGO - Completed Document Audit", {
      x: 40, y: ah - 60, size: 16, font: helv, color: rgb(0.06, 0.09, 0.16),
    });
    let yPos = ah - 90;
    for (const line of [
      `Document: ${sr.document.title}`,
      `Recipient: ${sr.recipientName || ""} <${sr.recipientEmail}>`,
      `Signed at: ${new Date().toISOString()}`,
      `Token: ${sr.token}`,
    ]) {
      auditPage.drawText(line, { x: 40, y: yPos, size: 10, font: helv, color: rgb(0.27, 0.33, 0.41) });
      yPos -= 16;
    }

    const signedBytes = await pdfDoc.save();
    const signedPath = `${sr.userId}/signed/${sr.id}.pdf`;
    await uploadFile(process.env.SUPABASE_BUCKET_SIGNED!, signedPath, Buffer.from(signedBytes), "application/pdf");

    const safeName = sr.document.title.replace(/[^a-z0-9.\-_]/gi, "_");
    const signedAttachment = {
      filename: `${safeName}-signed.pdf`,
      content: Buffer.from(signedBytes).toString("base64"),
    };

    const completedAt = new Date();
    const submissionData = {
      valuesJson: JSON.stringify(parsed.data.values),
      completedFilePath: signedPath,
      signerIp: req.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
      signerUserAgent: req.headers.get("user-agent") ?? null,
      completedAt,
    };
    const submission = await prisma.submission.upsert({
      where: { signingRequestId: sr.id },
      create: { signingRequestId: sr.id, ...submissionData },
      update: submissionData,
    });

    await prisma.signingRequest.update({
      where: { id: sr.id },
      data: { status: "COMPLETED", completedAt, completedFilePath: signedPath },
    });
    await prisma.auditEvent.create({
      data: {
        signingRequestId: sr.id,
        type: "COMPLETED",
        metadataJson: JSON.stringify({ submissionId: submission.id }),
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
        userAgent: req.headers.get("user-agent") ?? null,
      },
    });

    const downloadUrl = await getSignedUrl(process.env.SUPABASE_BUCKET_SIGNED!, signedPath, 60 * 60 * 24 * 30);
    const business = sr.user.businessProfile!;
    const logoUrl = business.logoPath ? getPublicUrl(process.env.SUPABASE_BUCKET_LOGOS!, business.logoPath) : null;
    const senderName = business.displayName || business.businessName || sr.user.name;
    const senderEmail = business.email || sr.user.email;

    await Promise.allSettled([
      sendEmail({
        to: sr.recipientEmail,
        subject: `Your signed copy of ${sr.document.title}`,
        react: DocumentCompletedEmail({
          recipientName: sr.recipientName || sr.recipientEmail,
          documentTitle: sr.document.title,
          senderName,
          downloadUrl,
          logoUrl,
          forParty: "recipient",
        }),
        attachments: [signedAttachment],
      }),
      senderEmail
        ? sendEmail({
            to: senderEmail,
            subject: `Signed: ${sr.document.title}`,
            react: DocumentCompletedEmail({
              recipientName: sr.recipientName || sr.recipientEmail,
              documentTitle: sr.document.title,
              senderName,
              downloadUrl,
              logoUrl,
              forParty: "sender",
            }),
            attachments: [signedAttachment],
          })
        : Promise.resolve(),
    ]);

    return NextResponse.json({ ok: true, downloadUrl });
  } catch (e: any) {
    console.error("Sign complete error:", e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
