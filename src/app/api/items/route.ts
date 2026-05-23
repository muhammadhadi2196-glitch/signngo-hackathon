import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { itemSchema } from "@/lib/validators/item";

export async function GET(req: Request) {
  try {
    const { profile } = await requireUser();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const items = await prisma.item.findMany({
      where: {
        userId: profile.id,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { profile } = await requireUser();
    const body = await req.json();
    const parsed = itemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const item = await prisma.item.create({
      data: { ...parsed.data, userId: profile.id },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
