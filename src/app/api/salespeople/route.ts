import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  try {
    const { profile } = await requireUser();
    const salespeople = await prisma.salesperson.findMany({
      where: { userId: profile.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      take: 200,
    });
    return NextResponse.json({ salespeople });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { profile } = await requireUser();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const salesperson = await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.salesperson.updateMany({
          where: { userId: profile.id },
          data: { isDefault: false },
        });
      }
      return tx.salesperson.create({
        data: { userId: profile.id, name: parsed.data.name, isDefault: parsed.data.isDefault },
      });
    });
    return NextResponse.json({ salesperson }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
