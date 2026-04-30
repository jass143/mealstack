import prisma from "@/lib/prisma";
import { withBrandOwner, success } from "@/lib/api-helpers";

// GET /api/brand/outlets — detailed list of outlets in the owner's brand
export async function GET() {
  return withBrandOwner(async ({ brandId }) => {
    const outlets = await prisma.tenant.findMany({
      where: { brandId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { orders: true, users: true } },
        users: {
          where: { role: "VENDOR" },
          select: { id: true, name: true, email: true, lastLoginAt: true },
          take: 1,
        },
      },
    });

    const outletIds = outlets.map((o) => o.id);
    const revenueGroups = outletIds.length
      ? await prisma.order.groupBy({
          by: ["tenantId"],
          where: { tenantId: { in: outletIds }, paymentStatus: "PAID" },
          _sum: { totalCents: true },
        })
      : [];
    const revMap = new Map(revenueGroups.map((g) => [g.tenantId, g._sum.totalCents ?? 0]));

    return success(
      outlets.map((o) => ({
        id: o.id,
        name: o.name,
        domain: o.domain,
        currency: o.currency,
        address: o.address,
        phone: o.phone,
        email: o.email,
        createdAt: o.createdAt,
        orderCount: o._count.orders,
        userCount: o._count.users,
        paidRevenueCents: revMap.get(o.id) ?? 0,
        vendor: o.users[0] ?? null,
      }))
    );
  });
}
