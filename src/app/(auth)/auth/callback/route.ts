import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 30,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  const redirectDashboard = `${origin}/dashboard`;
  const redirectLogin = `${origin}/login?error=auth_callback_failed`;

  if (!code) {
    return NextResponse.redirect(redirectLogin);
  }

  // Build the response we will return BEFORE exchanging the code, so the
  // Supabase client can stamp Set-Cookie headers directly onto it.
  const response = NextResponse.redirect(
    type === "recovery"
      ? `${origin}/settings/profile?mode=reset`
      : redirectDashboard
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write the session cookies directly onto the redirect response so
          // the browser stores them with the correct 30-day maxAge.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...COOKIE_OPTIONS, ...options })
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(redirectLogin);
  }

  // Ensure the user row exists in our database.
  const u = data.user;
  const name =
    (u.user_metadata?.full_name as string) ||
    (u.user_metadata?.name as string) ||
    u.email?.split("@")[0] ||
    "User";

  await prisma.user.upsert({
    where: { id: u.id },
    update: { email: u.email ?? "", name },
    create: {
      id: u.id,
      email: u.email ?? "",
      name,
      businessProfile: { create: {} },
    },
  });

  // response already has the session cookies stamped on it via setAll above.
  return response;
}
