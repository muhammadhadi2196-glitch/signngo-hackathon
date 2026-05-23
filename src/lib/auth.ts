import "server-only";
import { getSupabaseServerClient } from "./supabase/server";
import { prisma } from "./prisma";

async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [500, 1500];
  for (let i = 0; i <= delays.length; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (e?.code === "P1001" && i < delays.length) {
        await prisma.$disconnect();
        await new Promise((r) => setTimeout(r, delays[i]));
        continue;
      }
      throw e;
    }
  }
  throw new Error("unreachable");
}

export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  let profile = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { id: authUser.id },
      include: { businessProfile: true },
    })
  );

  // Self-heal: create Prisma row if missing (e.g. signed up before Part 2 ran)
  if (!profile) {
    const name =
      (authUser.user_metadata?.full_name as string) ||
      (authUser.user_metadata?.name as string) ||
      authUser.email?.split("@")[0] ||
      "User";

    profile = await withDbRetry(() =>
      prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email ?? "",
          name,
          businessProfile: { create: {} },
        },
        include: { businessProfile: true },
      })
    );
  }

  // Ensure businessProfile exists for older users
  if (!profile.businessProfile) {
    await withDbRetry(() =>
      prisma.businessProfile.create({ data: { userId: profile!.id } })
    );
    profile = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: profile!.id },
        include: { businessProfile: true },
      })
    );
  }

  return { authUser, profile: profile! };
}

export async function requireUser() {
  const data = await getCurrentUser();
  if (!data) throw new Error("UNAUTHORIZED");
  return data;
}
