import prisma from "@/lib/prisma";
import { withBrandOwner, success } from "@/lib/api-helpers";

// GET /api/brand/overview — aggregate stats across the owner's brand
export async function GET() {
  return withBrandOwner(async ({ brandId, commissionPercent }) => {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { name: true, commissionPercent: true, createdAt: true },
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
        totals: { orders: 0, revenueCents: 0, commissionDueCents: 0, commissionPaidCents: 0 },
        outlets: [],
      });
    }

    const [revenueAgg, ordersCount, ledgerPending, ledgerPaid] = await Promise.all([
      prisma.order.aggregate({
        where: { tenantId: { in: outletIds }, paymentStatus: "PAID" },
        _sum: { totalCents: true },
      }),
      prisma.order.count({ where: { tenantId: { in: outletIds } } }),
      prisma.commissionLedger.aggregate({
        where: { brandId, status: "PENDING" },
        _sum: { amountCents: true },
      }),
      prisma.commissionLedger.aggregate({
        where: { brandId, status: "PAID" },
        _sum: { amountCents: true },
      }),
    ]);

    // Per-outlet breakdown
    const perOutletRevenue = await prisma.order.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: outletIds }, paymentStatus: "PAID" },
      _sum: { totalCents: true },
      _count: { _all: true },
    });
    const perOutletCommission = await prisma.commissionLedger.groupBy({
      by: ["tenantId"],
      where: { brandId, status: "PENDING" },
      _sum: { amountCents: true },
    });

    const revMap = new Map(perOutletRevenue.map((r) => [r.tenantId, r]));
    const comMap = new Map(perOutletCommission.map((r) => [r.tenantId, r._sum.amountCents ?? 0]));

    const outletRows = outlets.map((o) => ({
      id: o.id,
      name: o.name,
      currency: o.currency,
      createdAt: o.createdAt,
      orderCount: revMap.get(o.id)?._count._all ?? 0,
      paidRevenueCents: revMap.get(o.id)?._sum.totalCents ?? 0,
      pendingCommissionCents: comMap.get(o.id) ?? 0,
    }));

    return success({
      brand: { ...brand, commissionPercent },
      outletCount: outlets.length,
      totals: {
        orders: ordersCount,
        revenueCents: revenueAgg._sum.totalCents ?? 0,
        commissionDueCents: ledgerPending._sum.amountCents ?? 0,
        commissionPaidCents: ledgerPaid._sum.amountCents ?? 0,
      },
      outlets: outletRows,
    });
  });
}
