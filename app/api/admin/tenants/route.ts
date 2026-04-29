import prisma from "@/lib/prisma";
import { withSuperAdmin, success } from "@/lib/api-helpers";

export async function GET() {
  return withSuperAdmin(async () => {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscription: { select: { status: true } },
        _count: { select: { users: true, orders: true } },
      },
    });

    // Compute revenue per tenant (sum of paid orders)
    const revenues = await prisma.order.groupBy({
      by: ["tenantId"],
      where: { paymentStatus: "PAID" },
      _sum: { totalCents: true },
    });
    const revenueMap = new Map(revenues.map((r) => [r.tenantId, r._sum.totalCents ?? 0]));

    const enriched = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      domain: t.domain,
      email: t.email,
      phone: t.phone,
      currency: t.currency,
      createdAt: t.createdAt,
      userCount: t._count.users,
      orderCount: t._count.orders,
      totalRevenueCents: revenueMap.get(t.id) ?? 0,
      subscriptionStatus: t.subscription?.status ?? null,
    }));

    return success(enriched);
  });
}
