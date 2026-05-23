import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 30, // 30 days
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
};

const PROTECTED_PATHS = [
  "/dashboard",
  "/documents",
  "/customers",
  "/invoices",
  "/quotes",
  "/items",
  "/reports",
  "/settings",
  "/builder",
  "/recurring",
];

export async function middleware(request: NextRequest) {
  // Start with a response that passes the request through unchanged.
  // If Supabase needs to refresh the session it will call setAll(), which
  // reassigns supabaseResponse with updated Set-Cookie headers.
  let supabaseResponse = NextResponse.next({ request });

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
          // 1. Write into the request so downstream SSR sees the fresh token.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 2. Create a new pass-through response that forwards the mutated
          //    request cookies, then stamp each refreshed token onto the
          //    response so the browser stores it (Set-Cookie header).
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...COOKIE_OPTIONS,
              ...options,
            })
          );
        },
      },
    }
  );

  // getUser() verifies the JWT with the Supabase Auth server and
  // automatically uses the refresh token when the access token is expired.
  // TOKEN_REFRESHED fires → setAll() above is called → supabaseResponse gets
  // the new 30-day cookie in its Set-Cookie headers.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Build the redirect response and copy any cookies that were written by
    // the Supabase client (e.g. a partial token refresh) so the browser does
    // not lose them across the redirect.
    const redirectResponse = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value, COOKIE_OPTIONS);
    });
    return redirectResponse;
  }

  // IMPORTANT: always return supabaseResponse (not a fresh NextResponse.next())
  // so the Set-Cookie headers for any refreshed tokens reach the browser.
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - public assets (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
