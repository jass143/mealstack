import prisma from "@/lib/prisma";
import { withSuperAdmin, success } from "@/lib/api-helpers";

export async function GET() {
  return withSuperAdmin(async () => {
    const [
      totalTenants,
      totalUsers,
      totalOrders,
      revenueAgg,
      upiAgg,
      recentTenants,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { paymentStatus: "PAID" },
        _sum: { totalCents: true },
      }),
      prisma.upiPayment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amountCents: true },
      }),
      prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, name: true, domain: true, createdAt: true },
      }),
    ]);

    return success({
      totalTenants,
      totalUsers,
      totalOrders,
      totalRevenueCents: revenueAgg._sum.totalCents ?? 0,
      totalUpiPaymentsCents: upiAgg._sum.amountCents ?? 0,
      recentTenants,
    });
  });
}
