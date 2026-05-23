import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]).optional(),
  autoSend: z.boolean().optional(),
  endDate: z.string().datetime().nullable().optional(),
  maxOccurrences: z.number().int().positive().nullable().optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const schedule = await prisma.recurringSchedule.findUnique({
      where: { id: params.id },
      include: {
        customer: { select: { id: true, name: true } },
        generatedItems: { orderBy: { generatedAt: "desc" }, take: 20 },
      },
    });
    if (!schedule || schedule.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ schedule });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const schedule = await prisma.recurringSchedule.findUnique({ where: { id: params.id } });
    if (!schedule || schedule.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const patch = parsed.data;
    const updated = await prisma.recurringSchedule.update({
      where: { id: params.id },
      data: {
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.autoSend !== undefined && { autoSend: patch.autoSend }),
        ...(patch.endDate !== undefined && {
          endDate: patch.endDate ? new Date(patch.endDate) : null,
        }),
        ...(patch.maxOccurrences !== undefined && { maxOccurrences: patch.maxOccurrences }),
        ...(patch.templateData !== undefined && { templateData: patch.templateData as Prisma.InputJsonValue }),
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ schedule: updated });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await requireUser();
    const schedule = await prisma.recurringSchedule.findUnique({ where: { id: params.id } });
    if (!schedule || schedule.userId !== profile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.recurringSchedule.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
