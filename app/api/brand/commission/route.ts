import prisma from "@/lib/prisma";
import { withBrandOwner, success } from "@/lib/api-helpers";

// GET /api/brand/commission — list of commission ledger entries
// Query params:
//   ?status=PENDING|PAID|ALL  (default: ALL)
//   ?limit=200                 (default: 200, max 500)
export async function GET(req: Request) {
  return withBrandOwner(async ({ brandId }) => {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const limitParam = parseInt(url.searchParams.get("limit") ?? "200", 10);
    const limit = Math.min(Math.max(limitParam, 1), 500);

    const where: { brandId: string; status?: "PENDING" | "PAID" } = { brandId };
    if (status === "PENDING" || status === "PAID") where.status = status;

    const entries = await prisma.commissionLedger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        tenant: { select: { id: true, name: true, currency: true } },
        order: { select: { orderNumber: true, totalCents: true } },
      },
    });

    return success(
      entries.map((e) => ({
        id: e.id,
        tenantId: e.tenantId,
        tenantName: e.tenant.name,
        currency: e.tenant.currency,
        orderNumber: e.order.orderNumber,
        orderTotalCents: e.order.totalCents,
        amountCents: e.amountCents,
        status: e.status,
        paidAt: e.paidAt,
        paidRef: e.paidRef,
        createdAt: e.createdAt,
      }))
    );
  });
}
