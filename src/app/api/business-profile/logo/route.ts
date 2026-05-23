import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  uploadFile,
  deleteFile,
  getPublicUrl,
} from "@/lib/storage/supabaseStorage";

const LOGO_BUCKET = process.env.SUPABASE_BUCKET_LOGOS ?? "logos";
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function POST(req: Request) {
  try {
    const { profile } = await requireUser();
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Max file size is 5MB" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Allowed types: PNG, JPG, WEBP, SVG" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${profile.id}/logo.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());

    // Delete old logo if it lives at a different path
    const prev = profile.businessProfile?.logoPath;
    if (prev && prev !== path) {
      await deleteFile(LOGO_BUCKET, prev).catch(() => {});
    }

    await uploadFile(LOGO_BUCKET, path, buf, file.type);

    const updated = await prisma.businessProfile.update({
      where: { userId: profile.id },
      data: { logoPath: path },
    });

    const publicUrl = getPublicUrl(LOGO_BUCKET, path);
    return NextResponse.json({ businessProfile: updated, publicUrl });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { profile } = await requireUser();
    if (profile.businessProfile?.logoPath) {
      await deleteFile(LOGO_BUCKET, profile.businessProfile.logoPath).catch(() => {});
    }
    const updated = await prisma.businessProfile.update({
      where: { userId: profile.id },
      data: { logoPath: null },
    });
    return NextResponse.json({ businessProfile: updated });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
