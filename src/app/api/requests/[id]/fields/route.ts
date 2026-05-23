import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const fieldSchema = z.object({
  page: z.coerce.number().int().min(1),
  x: z.coerce.number().min(0).max(1),
  y: z.coerce.number().min(0).max(1),
  width: z.coerce.number().min(0.01).max(1),
  height: z.coerce.number().min(0.01).max(1),
  type: z.enum(["SIGNATURE", "INITIALS", "TEXT", "DATE", "CHECKBOX", "DROPDOWN"]),
  label: z.string().max(200).default(""),
  placeholder: z.string().max(200).default(""),
  required: z.boolean().default(true),
  optionsJson: z.string().default("[]"),
  assignedTo: z.enum(["SENDER", "RECIPIENT"]).default("RECIPIENT"),
  prefilledValue: z.string().nullable().optional(),
  prefilledImagePath: z.string().nullable().optional(),
});

const schema = z.object({ fields: z.array(fieldSchema).default([]) });

export async function PUT(
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

    await prisma.documentField.deleteMany({ where: { signingRequestId: sr.id } });
    await prisma.documentField.createMany({
      data: parsed.data.fields.map((f) => ({
        signingRequestId: sr.id,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        type: f.type,
        label: f.label,
        placeholder: f.placeholder,
        required: f.required,
        optionsJson: f.optionsJson,
        assignedTo: f.assignedTo,
        prefilledValue: f.prefilledValue ?? null,
        prefilledImagePath: f.prefilledImagePath ?? null,
      })),
    });

    const fields = await prisma.documentField.findMany({ where: { signingRequestId: sr.id } });
    return NextResponse.json({ fields });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
