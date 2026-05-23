import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const schedule = await prisma.recurringSchedule.findUnique({ where: { id: params.id } });
    if (!schedule || schedule.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const take = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
    const skip = parseInt(searchParams.get("offset") ?? "0");

    const items = await prisma.recurringGenerated.findMany({
      where: { scheduleId: params.id },
      orderBy: { generatedAt: "desc" },
      take,
      skip,
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
