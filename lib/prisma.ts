import { PrismaClient } from "@prisma/client";

// ─── Singleton Prisma Client ────────────────────────────────────────────────
// Prevents creating multiple PrismaClient instances during Next.js hot-reload
// in development. In production, a single instance is reused.
// ────────────────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export default prisma;

// ─── Tenant-Scoped Query Helpers ────────────────────────────────────────────
//
// These helpers enforce tenant isolation at the query level.
// Use them in API routes instead of raw prisma calls when you want
// compile-time guarantees that tenantId is always present.
//
// Example:
//   const products = await tenantQuery(ctx.tenantId).product.findMany();
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns a tenant-scoped helper that automatically injects `tenantId`
 * into `where` clauses and `data` objects for create operations.
 *
 * This is a convenience wrapper — the raw prisma client is still available
 * for complex queries (joins, transactions) where you manually add tenantId.
 */
export function tenantScope(tenantId: string) {
  if (!tenantId) {
    throw new Error("tenantScope: tenantId is required. This is a programming error — ensure the user is authenticated and the session contains a valid tenantId.");
  }

  return {
    tenantId,

    /** Inject tenantId into a where clause */
    where<T extends Record<string, unknown>>(clause: T = {} as T): T & { tenantId: string } {
      return { ...clause, tenantId };
    },

    /** Inject tenantId into a create data object */
    data<T extends Record<string, unknown>>(fields: T): T & { tenantId: string } {
      return { ...fields, tenantId };
    },

    /**
     * Verify that a record belongs to this tenant.
     * Use before update/delete operations on records fetched by user-supplied ID.
     */
    async verifyOwnership(
      model: "product" | "order" | "customer" | "inventoryItem" | "category" | "supplier" | "user",
      id: string
    ): Promise<boolean> {
      const record = await (prisma[model] as any).findFirst({
        where: { id, tenantId },
        select: { id: true },
      });
      return !!record;
    },
  };
}
