import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedUrl } from "@/lib/storage/supabaseStorage";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const doc = await prisma.document.findUnique({ where: { id: params.id } });
    if (!doc || doc.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const url = await getSignedUrl(process.env.SUPABASE_BUCKET_DOCUMENTS!, doc.storagePath, 60 * 60);
    return NextResponse.json({ url });
  } catch (e: any) {
    console.error("Document file error:", e);
    if (e?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
