import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage/supabaseStorage";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

const schema = z.object({ dataUrl: z.string().min(20) });

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const sr = await prisma.signingRequest.findUnique({ where: { id: params.id } });
    if (!sr || sr.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const match = parsed.data.dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/);
    if (!match) return NextResponse.json({ error: "Invalid image data" }, { status: 400 });

    const mime = `image/${match[1]}` as "image/png" | "image/jpeg";
    const bytes = Buffer.from(match[2], "base64");
    const path = `${profile.id}/prefill/${sr.id}/${createId()}.png`;

    await uploadFile(process.env.SUPABASE_BUCKET_SIGNED!, path, bytes, mime);
    return NextResponse.json({ path });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
