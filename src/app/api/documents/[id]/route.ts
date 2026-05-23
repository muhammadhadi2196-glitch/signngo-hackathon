import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage/supabaseStorage";

async function ensureOwner(id: string, userId: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  return doc && doc.userId === userId ? doc : null;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const doc = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        signingRequests: {
          orderBy: { createdAt: "desc" },
          include: { fields: true, auditEvents: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
    if (!doc || doc.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ document: doc });
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
    const doc = await ensureOwner(params.id, profile.id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteFile(process.env.SUPABASE_BUCKET_DOCUMENTS!, doc.storagePath).catch(() => {});
    await prisma.document.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
