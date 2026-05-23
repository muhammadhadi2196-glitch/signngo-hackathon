import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { itemSchema } from "@/lib/validators/item";

async function ensureOwnership(id: string, userId: string) {
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item || item.userId !== userId) return null;
  return item;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const item = await ensureOwnership(params.id, profile.id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const existing = await ensureOwnership(params.id, profile.id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = itemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.item.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ item: updated });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const existing = await ensureOwnership(params.id, profile.id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.item.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
