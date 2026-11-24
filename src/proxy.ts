import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAME,
  requiresAccountActivation,
  verifySessionToken,
} from "@/lib/auth";
import { ROLE_DASHBOARD, isRole } from "@/lib/roles";
import type { Role } from "@/types";

const PUBLIC_PATHS = ["/", "/login", "/forgot-password"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/forgot-password/") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  );
}

function isAllowedBeforeActivationApi(pathname: string) {
  return (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/me" ||
    pathname === "/api/auth/activate" ||
    pathname.startsWith("/api/auth/forgot-password")
  );
}

/**
 * Checks if an authenticated user with `userRole` is permitted to access
 * a shared detail/monitoring route under another role's URL prefix.
 */
function isAuthorizedCrossRolePath(pathname: string, userRole: Role): boolean {
  // Admin can inspect and manage Tugas, Kuis, Submissions, and Class detail pages
  if (userRole === "admin") {
    if (
      /^\/guru\/(assignments|quizzes)\/(?!new(?:\/|$))[^/]+(?:\/(submissions|edit))?$/.test(
        pathname
      )
    ) {
      return true;
    }
    if (/^\/guru\/classes\/(?!new(?:\/|$))[^/]+$/.test(pathname)) {
      return true;
    }
    if (/^\/siswa\/(assignments|quiz)\/[^/]+$/.test(pathname)) {
      return true;
    }
  }

  // Kepsek can inspect Tugas, Kuis, Submissions, and Class detail pages in read-only supervision mode
  if (userRole === "kepsek") {
    if (
      /^\/guru\/(assignments|quizzes)\/(?!new(?:\/|$))[^/]+(?:\/submissions)?$/.test(
        pathname
      )
    ) {
      return true;
    }
    if (/^\/guru\/classes\/(?!new(?:\/|$))[^/]+$/.test(pathname)) {
      return true;
    }
    if (/^\/siswa\/(assignments|quiz)\/[^/]+$/.test(pathname)) {
      return true;
    }
  }

  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = isPublicPath(pathname);

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (
    (pathname.startsWith("/login") || pathname.startsWith("/forgot-password")) &&
    session
  ) {
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
        if (isAuthorizedCrossRolePath(pathname, session.role)) {
          break;
        }
        return NextResponse.redirect(
          new URL(ROLE_DASHBOARD[session.role], request.url)
        );
      }
    }
  }

  // Enforce mandatory first-login activation for Guru and Kurikulum
  if (requiresAccountActivation(session)) {
    if (pathname.startsWith("/api/")) {
      if (!isAllowedBeforeActivationApi(pathname)) {
        return NextResponse.json(
          {
            success: false,
            code: "ACTIVATION_REQUIRED",
            requiresActivation: true,
            message:
              "Akun Anda belum diaktivasi. Silakan selesaikan aktivasi akun terlebih dahulu.",
          },
          { status: 403 }
        );
      }
      return NextResponse.next();
    }

    const roleRoot = ROLE_DASHBOARD[session.role];
    if (roleRoot && pathname !== roleRoot) {
      return NextResponse.redirect(new URL(roleRoot, request.url));
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
