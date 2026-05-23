import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // 30-day persistent session — survives browser restarts and new tabs.
        // The library hardcodes maxAge=400d for set operations, so this mainly
        // controls the sameSite/secure defaults used in edge cases.
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    }
  );
}
