import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { ROLE_DASHBOARD, isRole } from "@/lib/roles";

const PUBLIC_PATHS = ["/", "/login"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = isPublicPath(pathname);

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/login") && session) {
    return NextResponse.redirect(
      new URL(ROLE_DASHBOARD[session.role], request.url)
    );
  }

  if (isPublic) {
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const rolePrefixes: Record<string, string> = {
    admin: "/admin",
    guru: "/guru",
    kurikulum: "/kurikulum",
    kepsek: "/kepsek",
    siswa: "/siswa",
  };

  for (const [role, prefix] of Object.entries(rolePrefixes)) {
    if (pathname.startsWith(prefix) && session.role !== role) {
      if (isRole(session.role)) {
        return NextResponse.redirect(
          new URL(ROLE_DASHBOARD[session.role], request.url)
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
