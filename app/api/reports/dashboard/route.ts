import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(_req: NextRequest) {
  return withAuth(async (ctx) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Today's orders count
    const todaysOrders = await prisma.order.count({
      where: {
        tenantId: ctx.tenantId,
        createdAt: { gte: todayStart, lt: todayEnd },
        status: { not: "CANCELLED" },
      },
    });

    // Today's revenue
    const todaysRevenueAgg = await prisma.order.aggregate({
      where: {
        tenantId: ctx.tenantId,
        createdAt: { gte: todayStart, lt: todayEnd },
        status: { not: "CANCELLED" },
        paymentStatus: "PAID",
      },
      _sum: { totalCents: true },
    });
    const todaysRevenue = todaysRevenueAgg._sum.totalCents ?? 0;

    // Active orders (not completed/cancelled)
    const activeOrders = await prisma.order.count({
      where: {
        tenantId: ctx.tenantId,
        status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED"] },
      },
    });

    // Low stock items
    const allInventory = await prisma.inventoryItem.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: { quantity: true, reorderLevel: true },
    });
    const lowStockItems = allInventory.filter(
      (item) => item.quantity <= item.reorderLevel
    ).length;

    // Last 7 days revenue
    const revenueByDay: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayAgg = await prisma.order.aggregate({
        where: {
          tenantId: ctx.tenantId,
          createdAt: { gte: dayStart, lt: dayEnd },
          status: { not: "CANCELLED" },
          paymentStatus: "PAID",
        },
        _sum: { totalCents: true },
      });

      revenueByDay.push({
        date: dayStart.toISOString().split("T")[0],
        revenue: dayAgg._sum.totalCents ?? 0,
      });
    }

    return success({
      todaysOrders,
      todaysRevenue,
      activeOrders,
      lowStockItems,
      revenueByDay,
    });
  }, [Role.VENDOR, Role.MANAGER, Role.BRAND_OWNER]);
}
