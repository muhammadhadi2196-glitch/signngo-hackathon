import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const sr = await prisma.signingRequest.findUnique({
      where: { id: params.id },
      include: {
        document: true,
        fields: { orderBy: { createdAt: "asc" } },
        auditEvents: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!sr || sr.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ request: sr });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const sr = await prisma.signingRequest.findUnique({ where: { id: params.id } });
    if (!sr || sr.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.signingRequest.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
