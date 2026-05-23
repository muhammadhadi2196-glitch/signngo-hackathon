import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validators/customer";

async function ensureOwnership(id: string, userId: string) {
  const c = await prisma.customer.findUnique({ where: { id } });
  if (!c || c.userId !== userId) return null;
  return c;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const c = await ensureOwnership(params.id, profile.id);
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        invoices: { orderBy: { createdAt: "desc" }, take: 20 },
        quotes: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    return NextResponse.json({ customer });
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
    const c = await ensureOwnership(params.id, profile.id);
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ customer: updated });
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
    const c = await ensureOwnership(params.id, profile.id);
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.customer.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
