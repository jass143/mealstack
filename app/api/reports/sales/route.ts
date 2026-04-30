import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  return withAuth(async (ctx) => {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return error("startDate and endDate are required");
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    endDate.setDate(endDate.getDate() + 1); // include end date fully

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return error("Invalid date format");
    }

    // All paid, non-cancelled orders in range
    const orders = await prisma.order.findMany({
      where: {
        tenantId: ctx.tenantId,
        createdAt: { gte: startDate, lt: endDate },
        status: { not: "CANCELLED" },
      },
      include: {
        items: true,
      },
    });

    // Total stats
    const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalCents, 0);
    const totalOrders = paidOrders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Daily revenue array
    const dailyMap = new Map<string, number>();
    for (const order of paidOrders) {
      const day = order.createdAt.toISOString().split("T")[0];
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + order.totalCents);
    }
    const dailyRevenue = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));

    // Top 10 products by revenue
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of paidOrders) {
      for (const item of order.items) {
        const existing = productMap.get(item.productId);
        const itemRevenue = item.unitPrice * item.qty;
        if (existing) {
          existing.quantity += item.qty;
          existing.revenue += itemRevenue;
        } else {
          productMap.set(item.productId, {
            name: item.productName,
            quantity: item.qty,
            revenue: itemRevenue,
          });
        }
      }
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Orders by type breakdown
    const ordersByType: Record<string, number> = {};
    for (const order of paidOrders) {
      ordersByType[order.orderType] = (ordersByType[order.orderType] ?? 0) + 1;
    }
    const ordersByTypeArray = Object.entries(ordersByType).map(([type, count]) => ({
      type,
      count,
    }));

    // Payment method breakdown
    const paymentMethods: Record<string, number> = {};
    for (const order of paidOrders) {
      const method = order.paymentMethod ?? "UNKNOWN";
      paymentMethods[method] = (paymentMethods[method] ?? 0) + 1;
    }
    const paymentMethodsArray = Object.entries(paymentMethods).map(
      ([method, count]) => ({ method, count })
    );

    return success({
      totalRevenue,
      totalOrders,
      avgOrderValue,
      dailyRevenue,
      topProducts,
      ordersByType: ordersByTypeArray,
      paymentMethods: paymentMethodsArray,
    });
  }, [Role.VENDOR, Role.MANAGER, Role.BRAND_OWNER]);
}
