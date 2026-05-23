import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSigningToken } from "@/lib/tokens";
import { z } from "zod";

const schema = z.object({
  documentId: z.string(),
  recipientName: z.string().max(200).default(""),
  recipientEmail: z.string().email(),
  expiresInDays: z.coerce.number().int().min(1).max(365).default(30),
});

export async function POST(req: Request) {
  try {
    const { profile } = await requireUser();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const doc = await prisma.document.findUnique({ where: { id: parsed.data.documentId } });
    if (!doc || doc.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);
    const request = await prisma.signingRequest.create({
      data: {
        documentId: doc.id,
        userId: profile.id,
        recipientName: parsed.data.recipientName,
        recipientEmail: parsed.data.recipientEmail,
        token: generateSigningToken(),
        status: "DRAFT",
        expiresAt,
      },
    });

    await prisma.auditEvent.create({
      data: {
        signingRequestId: request.id,
        type: "CREATED",
        metadataJson: JSON.stringify({ recipientEmail: parsed.data.recipientEmail }),
      },
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
