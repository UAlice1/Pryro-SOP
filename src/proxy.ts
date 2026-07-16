import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Next.js 16 proxy (replaces middleware.ts).
 *
 * Uses next-auth/jwt getToken() to read the session JWT directly from the
 * cookie — no HTTP round-trip, no circular dependency with the auth handler.
 *
 * Responsibilities:
 *  1. Pass /api/auth/** through untouched (NextAuth endpoints).
 *  2. Redirect authenticated users away from /login and /register.
 *  3. Redirect unauthenticated users to /login for page routes.
 *  4. Return 401 for unauthenticated API requests.
 *  5. Guard /api/admin/** to ORG_ADMIN / SUPER_ADMIN only.
 *  6. Reject org-scoped API calls from users with no organization.
 */

const AUTH_API_PREFIX  = "/api/auth";
const ADMIN_API_PREFIX = "/api/admin";
const PUBLIC_PAGES     = ["/login", "/register"];

// These API routes work without an organizationId — either user-scoped
// or routes that handle the "no org" case themselves
const ORG_EXEMPT_API = [
  "/api/auth",
  "/api/register",
  "/api/setup",
  "/api/assistant",
  "/api/chat",
  "/api/ai",
  "/api/generate-sop",
  "/api/sops",
  "/api/dashboard",
  "/api/tags",
  "/api/admin/org",
  "/api/profile",
  "/api/user",
  "/api/ai/settings",
  "/api/categories",
  "/api/departments",
  "/api/notifications",
];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 1. Always pass NextAuth endpoints through ─────────────────────────────
  if (pathname.startsWith(AUTH_API_PREFIX)) {
    return NextResponse.next();
  }

  // ── Read JWT directly from cookie (Edge-safe, no DB call) ─────────────────
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";

  const token = await getToken({
    req,
    secret,
    // In @auth/core (NextAuth v5), the cookie name IS the salt used for
    // JWT decryption — both must match what NextAuth set when issuing the token
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
    salt:
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
  }).catch(() => null);

  const isAuthenticated = !!token;
  const role  = (token?.role  as string | undefined) ?? "EMPLOYEE";
  const orgId = (token?.organizationId as string | undefined) ?? null;

  // ── 2. Auth pages — redirect logged-in users to dashboard ─────────────────
  if (PUBLIC_PAGES.includes(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/sops/new", req.url));
    }
    return NextResponse.next();
  }

  // ── 3 & 4. Require authentication ─────────────────────────────────────────
  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 5. Admin API guard ────────────────────────────────────────────────────
  if (pathname.startsWith(ADMIN_API_PREFIX)) {
    if (role !== "SUPER_ADMIN" && role !== "ORG_ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
  }

  // ── 6. Org isolation ──────────────────────────────────────────────────────
  const skipOrgCheck = ORG_EXEMPT_API.some((p) => pathname.startsWith(p));
  if (
    pathname.startsWith("/api/") &&
    role !== "SUPER_ADMIN" &&
    !orgId &&
    !skipOrgCheck
  ) {
    return NextResponse.json(
      { error: "You must belong to an organization to access this resource" },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  // Exclude static assets; run on all pages and API routes
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
