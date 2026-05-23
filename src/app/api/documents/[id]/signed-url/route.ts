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

    const doc = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        signingRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, completedFilePath: true },
        },
      },
    });

    if (!doc || doc.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const sr = doc.signingRequests[0];
    if (!sr || sr.status !== "COMPLETED" || !sr.completedFilePath) {
      return NextResponse.json({ error: "Signed document not available" }, { status: 404 });
    }

    const url = await getSignedUrl(process.env.SUPABASE_BUCKET_SIGNED!, sr.completedFilePath, 60 * 60);
    return NextResponse.json({ url });
  } catch (e: any) {
    console.error("signed-url error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
