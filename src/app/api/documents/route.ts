import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
  title: z.string().min(1).max(300),
  originalFilename: z.string().min(1).max(300),
  storagePath: z.string().min(1),
  pageCount: z.coerce.number().int().min(0).max(2000).default(0),
});

export async function GET() {
  try {
    const { profile } = await requireUser();
    const docs = await prisma.document.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        signingRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            recipientName: true,
            recipientEmail: true,
            completedAt: true,
          },
        },
      },
    });
    return NextResponse.json({ documents: docs });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { profile } = await requireUser();
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const doc = await prisma.document.create({
      data: { ...parsed.data, userId: profile.id },
    });
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
