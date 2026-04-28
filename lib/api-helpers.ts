import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { Role } from "@prisma/client";
import { ZodSchema } from "zod";

// ─── API Context ────────────────────────────────────────────────────────────
// Every authenticated API handler receives this context.
// `tenantId` is extracted from the JWT session — it cannot be spoofed via
// headers or query params. This is the foundation of tenant isolation.
// ────────────────────────────────────────────────────────────────────────────

export type ApiContext = {
  userId: string;
  tenantId: string;
  role: Role;
};

// ─── Response Helpers ───────────────────────────────────────────────────────

export function success(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ─── Session Extraction ─────────────────────────────────────────────────────

export async function getApiContext(): Promise<ApiContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const { id, tenantId, role } = session.user as {
    id: string;
    tenantId: string;
    role: string;
  };

  // Hard guard: tenantId must exist in session
  if (!id || !tenantId) return null;

  return { userId: id, tenantId, role: role as Role };
}

// ─── Auth Wrapper ───────────────────────────────────────────────────────────
//
// Wraps any API handler with:
//   1. Authentication check (valid JWT session)
//   2. Optional role-based authorization
//   3. Automatic tenant context injection
//
// Usage:
//   export async function GET() {
//     return withAuth(async (ctx) => {
//       // ctx.tenantId is always valid here
//       const data = await prisma.product.findMany({
//         where: { tenantId: ctx.tenantId }
//       });
//       return success(data);
//     }, [Role.ADMIN, Role.MANAGER]);
//   }
// ────────────────────────────────────────────────────────────────────────────

export async function withAuth(
  handler: (ctx: ApiContext) => Promise<NextResponse>,
  allowedRoles?: Role[]
): Promise<NextResponse> {
  try {
    const ctx = await getApiContext();

    if (!ctx) {
      return error("Unauthorized", 401);
    }

    if (allowedRoles && !allowedRoles.includes(ctx.role)) {
      return error("Forbidden: insufficient permissions", 403);
    }

    return await handler(ctx);
  } catch (err) {
    console.error("[API Error]", err);
    return error("Internal server error", 500);
  }
}

// ─── Validation Helper ──────────────────────────────────────────────────────

export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown
): { data: T } | { error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const messages = result.error.errors.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    return { error: messages.join(", ") };
  }
  return { data: result.data };
}

// ─── Pagination Helper ──────────────────────────────────────────────────────

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
