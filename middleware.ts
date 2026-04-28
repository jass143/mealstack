import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Multi-Tenant Middleware ────────────────────────────────────────────────
//
// Tenant resolution priority:
//   1. JWT session → tenantId already embedded at login (authenticated requests)
//   2. Subdomain   → cafe.mealstack.com  →  tenant domain = "cafe"
//   3. Header      → x-tenant-id (API integrations / testing)
//
// The resolved tenantId is set on the x-tenant-id response header so
// downstream server components and API routes can read it.
// For authenticated users, the session JWT is the source of truth.
// ────────────────────────────────────────────────────────────────────────────

const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/api/subscription/webhook", "/api/upi/webhook"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function resolveSubdomain(host: string): string | null {
  // Strip port if present  (e.g. cafe.mealstack.com:3000 → cafe.mealstack.com)
  const hostname = host.split(":")[0];

  // Skip localhost / IP addresses
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  const parts = hostname.split(".");
  // Need at least 3 parts for a subdomain: sub.domain.tld
  if (parts.length >= 3) {
    const sub = parts[0];
    // Ignore common non-tenant subdomains
    if (!["www", "api", "app", "admin", "mail", "staging"].includes(sub)) {
      return sub;
    }
  }
  return null;
}

export default withAuth(
  function middleware(req) {
    const response = NextResponse.next();
    let tenantId: string | null = null;

    // Priority 1: From JWT session (authenticated users)
    const token = req.nextauth.token;
    if (token?.tenantId) {
      tenantId = token.tenantId as string;
    }

    // Priority 2: Subdomain detection (unauthenticated / public pages)
    if (!tenantId) {
      const host = req.headers.get("host") || "";
      tenantId = resolveSubdomain(host);
    }

    // Priority 3: Explicit header (API integrations)
    if (!tenantId) {
      tenantId = req.headers.get("x-tenant-id");
    }

    // Propagate to downstream handlers
    if (tenantId) {
      response.headers.set("x-tenant-id", tenantId);
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes — always allow
        if (isPublicPath(pathname)) return true;

        // Protected routes — require valid session
        if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/")) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    // Match all routes except static assets
    "/((?!_next/static|_next/image|favicon.ico|sounds/).*)",
  ],
};
