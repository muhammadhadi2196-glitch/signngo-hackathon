import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const sr = await prisma.signingRequest.findUnique({ where: { token: params.token } });
    if (!sr) return NextResponse.json({ ok: false }, { status: 404 });

    if (sr.status === "SENT") {
      await prisma.signingRequest.update({
        where: { id: sr.id },
        data: { status: "VIEWED" },
      });
    }

    const ua = req.headers.get("user-agent") || "";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    await prisma.auditEvent.create({
      data: { signingRequestId: sr.id, type: "VIEWED", ip, userAgent: ua },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Sign viewed error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
