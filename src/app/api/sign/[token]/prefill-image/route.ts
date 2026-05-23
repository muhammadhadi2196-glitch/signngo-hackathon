import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedUrl } from "@/lib/storage/supabaseStorage";

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");
    if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

    const sr = await prisma.signingRequest.findUnique({
      where: { token: params.token },
      include: { fields: { select: { prefilledImagePath: true } } },
    });
    if (!sr) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (sr.expiresAt && sr.expiresAt < new Date()) {
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }

    // Only allow paths that belong to this signing request's prefilled fields
    const allowedPaths = new Set(
      sr.fields.map((f) => f.prefilledImagePath).filter(Boolean)
    );
    if (!allowedPaths.has(path)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = await getSignedUrl(process.env.SUPABASE_BUCKET_SIGNED!, path, 60 * 60);
    return NextResponse.json({ url });
  } catch (e: any) {
    console.error("Prefill image error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
