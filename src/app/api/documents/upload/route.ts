import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSignedUploadUrl } from "@/lib/storage/supabaseStorage";
import { createId } from "@paralleldrive/cuid2";

export async function POST(req: Request) {
  try {
    const { profile } = await requireUser();
    const body = await req.json().catch(() => ({}));
    const filename: string = body.filename || `${createId()}.pdf`;
    const ext = filename.split(".").pop()?.toLowerCase() || "pdf";
    if (ext !== "pdf") {
      return NextResponse.json({ error: "PDF only" }, { status: 400 });
    }
    const path = `${profile.id}/documents/${createId()}.pdf`;
    const upload = await createSignedUploadUrl(process.env.SUPABASE_BUCKET_DOCUMENTS!, path);
    return NextResponse.json({ ...upload, path });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
