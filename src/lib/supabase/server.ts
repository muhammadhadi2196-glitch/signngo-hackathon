import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 30, // 30 days
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
};

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...COOKIE_OPTIONS, ...options })
            );
          } catch {
            // Server Components cannot set cookies — only middleware/route
            // handlers can. The middleware will apply the refresh on the
            // next request, so this is safe to swallow here.
          }
        },
      },
    }
  );
}
