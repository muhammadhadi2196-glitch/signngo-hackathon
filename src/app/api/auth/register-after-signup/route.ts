import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const fallbackName = typeof body?.name === "string" ? body.name : null;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name =
    fallbackName ||
    (user.user_metadata?.full_name as string) ||
    user.email?.split("@")[0] ||
    "User";

  await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email ?? "", name },
    create: {
      id: user.id,
      email: user.email ?? "",
      name,
      businessProfile: { create: {} },
    },
  });

  return NextResponse.json({ ok: true });
}
