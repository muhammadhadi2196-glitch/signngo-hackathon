import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { businessProfileSchema } from "@/lib/validators/businessProfile";

export async function GET() {
  try {
    const { profile } = await requireUser();
    return NextResponse.json({ businessProfile: profile.businessProfile });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const { profile } = await requireUser();
    const body = await req.json();
    const parsed = businessProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.businessProfile.update({
      where: { userId: profile.id },
      data: parsed.data,
    });

    return NextResponse.json({ businessProfile: updated });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
