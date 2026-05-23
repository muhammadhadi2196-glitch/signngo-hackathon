import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const existing = await prisma.salesperson.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== profile.id)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const salesperson = await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.salesperson.updateMany({
          where: { userId: profile.id },
          data: { isDefault: false },
        });
      }
      return tx.salesperson.update({ where: { id: params.id }, data: parsed.data });
    });
    return NextResponse.json({ salesperson });
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
    const existing = await prisma.salesperson.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== profile.id)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.salesperson.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
