import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// ─── Multi-Tenant Middleware ────────────────────────────────────────────────
//
// Routing model:
//   /admin/*           → SUPERADMIN only (platform admin console). No tenant.
//   /admin/login       → public
//   /dashboard/*       → VENDOR / MANAGER / BRAND_OWNER. Tenant-scoped via JWT.
//   /dashboard/brand/* → BRAND_OWNER only (cross-tenant brand views).
//   /api/admin/*       → SUPERADMIN only. No tenant header.
//   /api/brand/*       → BRAND_OWNER only. No tenant header.
//   everything else    → tenant-scoped via JWT.
//
// Tenant resolution (for tenant-scoped routes only):
//   1. JWT session → tenantId already embedded at login (authenticated)
//   2. Subdomain   → cafe.mealstack.com → tenant domain = "cafe"
//   3. Header      → x-tenant-id (API integrations / testing)
// ────────────────────────────────────────────────────────────────────────────

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/admin/login",
  "/api/auth",
  "/api/subscription/webhook",
  "/api/upi/webhook",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

function isAdminPath(pathname: string): boolean {
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return false;
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin");
}

function isBrandPath(pathname: string): boolean {
  return (
    pathname === "/dashboard/brand" ||
    pathname.startsWith("/dashboard/brand/") ||
    pathname.startsWith("/api/brand/") ||
    pathname === "/api/brand"
  );
}

function resolveSubdomain(host: string): string | null {
  const hostname = host.split(":")[0];
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const sub = parts[0];
    if (!["www", "api", "app", "admin", "mail", "staging"].includes(sub)) {
      return sub;
    }
  }
  return null;
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const role = token?.role as string | undefined;

    // SuperAdmin trying to use the regular dashboard → bounce to /admin
    if (role === "SUPERADMIN" && (pathname.startsWith("/dashboard") || pathname === "/login")) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Vendor/Manager/BrandOwner trying to access /admin → bounce to /dashboard
    if (role && role !== "SUPERADMIN" && isAdminPath(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Non-BrandOwner trying to access brand views → bounce to /dashboard
    if (role && role !== "BRAND_OWNER" && isBrandPath(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const response = NextResponse.next();

    // Tenant header — only for non-admin routes
    if (!isAdminPath(pathname)) {
      let tenantId: string | null = null;

      if (token?.tenantId) {
        tenantId = token.tenantId as string;
      }

      if (!tenantId) {
        const host = req.headers.get("host") || "";
        tenantId = resolveSubdomain(host);
      }

      if (!tenantId) {
        tenantId = req.headers.get("x-tenant-id");
      }

      if (tenantId) {
        response.headers.set("x-tenant-id", tenantId);
      }
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        if (isPublicPath(pathname)) return true;

        // /admin/* and /api/admin/* require a SUPERADMIN session
        if (isAdminPath(pathname)) {
          return token?.role === "SUPERADMIN";
        }

        // /dashboard/* and /api/* require any valid session
        if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/")) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon-48.png|sounds/|images/).*)",
  ],
};
