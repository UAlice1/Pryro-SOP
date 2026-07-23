import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const AUTH_API_PREFIX  = "/api/auth";
const ADMIN_API_PREFIX = "/api/admin";
const PUBLIC_PAGES     = ["/login", "/register"];

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

  // ── Read JWT directly from cookie ─────────────────────────────────────────
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";

  let token = null;
  try {
    // Try NextAuth v5 cookie name first
    const isSecure = req.url.startsWith("https://");
    const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";
    token = await getToken({ req, secret, cookieName, salt: cookieName });

    // Fallback to v4 cookie name
    if (!token) {
      token = await getToken({ req, secret });
    }
  } catch {
    token = null;
  }

  const isAuthenticated = !!token;
  const role  = (token?.role  as string | undefined) ?? "EMPLOYEE";
  const orgId = (token?.organizationId as string | undefined) ?? null;

  // ── 2. Auth pages — redirect logged-in users to dashboard ─────────────────
  if (PUBLIC_PAGES.includes(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/sops", req.url));
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
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
