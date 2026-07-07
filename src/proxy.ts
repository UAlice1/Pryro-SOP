import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/register", "/forgot-password"];
const authRoutes = ["/login", "/register", "/forgot-password"];

export default async function proxy(req: NextRequest) {
  const session = await auth();
  const { nextUrl } = req;
  const isLoggedIn = !!session;
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
