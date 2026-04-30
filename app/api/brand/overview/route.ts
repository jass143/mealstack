import prisma from "@/lib/prisma";
import { withBrandOwner, success } from "@/lib/api-helpers";

// GET /api/brand/overview — aggregate stats across the owner's brand
export async function GET() {
  return withBrandOwner(async ({ brandId }) => {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { name: true, createdAt: true },
    });

    const outlets = await prisma.tenant.findMany({
      where: { brandId },
      select: { id: true, name: true, currency: true, createdAt: true },
    });
    const outletIds = outlets.map((t) => t.id);

    if (outletIds.length === 0) {
      return success({
        brand,
        outletCount: 0,
        totals: { orders: 0, revenueCents: 0 },
        outlets: [],
      });
    }

    const [revenueAgg, ordersCount] = await Promise.all([
      prisma.order.aggregate({
        where: { tenantId: { in: outletIds }, paymentStatus: "PAID" },
        _sum: { totalCents: true },
      }),
      prisma.order.count({ where: { tenantId: { in: outletIds } } }),
    ]);

    const perOutletRevenue = await prisma.order.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: outletIds }, paymentStatus: "PAID" },
      _sum: { totalCents: true },
      _count: { _all: true },
    });
    const revMap = new Map(perOutletRevenue.map((r) => [r.tenantId, r]));

    const outletRows = outlets.map((o) => ({
      id: o.id,
      name: o.name,
      currency: o.currency,
      createdAt: o.createdAt,
      orderCount: revMap.get(o.id)?._count._all ?? 0,
      paidRevenueCents: revMap.get(o.id)?._sum.totalCents ?? 0,
    }));

    return success({
      brand,
      outletCount: outlets.length,
      totals: {
        orders: ordersCount,
        revenueCents: revenueAgg._sum.totalCents ?? 0,
      },
      outlets: outletRows,
    });
  });
}
