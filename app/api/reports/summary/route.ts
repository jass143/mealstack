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

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return error("Invalid date format");
    }

    const summaries = await prisma.dailySummary.findMany({
      where: {
        tenantId: ctx.tenantId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    });

    return success(summaries);
  }, [Role.ADMIN, Role.MANAGER]);
}

export async function POST(req: NextRequest) {
  return withAuth(async (ctx) => {
    const body = await req.json();
    const { date } = body;

    if (!date) return error("date is required");

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) return error("Invalid date format");

    const dayStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    );
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Gather order data for the day
    const orders = await prisma.order.findMany({
      where: {
        tenantId: ctx.tenantId,
        createdAt: { gte: dayStart, lt: dayEnd },
        status: { not: "CANCELLED" },
        paymentStatus: "PAID",
      },
      include: { items: true },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalCents, 0);
    const totalTax = orders.reduce((sum, o) => sum + o.taxCents, 0);
    const totalDiscount = orders.reduce((sum, o) => sum + o.discountCents, 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Unique customers
    const customerIds = new Set(orders.map((o) => o.customerId).filter(Boolean));
    const customerCount = customerIds.size;

    // Top product by revenue
    const productRevenue = new Map<string, number>();
    for (const order of orders) {
      for (const item of order.items) {
        const rev = item.unitPrice * item.qty;
        productRevenue.set(item.productId, (productRevenue.get(item.productId) ?? 0) + rev);
      }
    }
    let topProductId: string | null = null;
    let maxRev = 0;
    for (const [pid, rev] of productRevenue) {
      if (rev > maxRev) {
        maxRev = rev;
        topProductId = pid;
      }
    }

    const summary = await prisma.dailySummary.upsert({
      where: {
        tenantId_date: {
          tenantId: ctx.tenantId,
          date: dayStart,
        },
      },
      update: {
        totalOrders,
        totalRevenue,
        totalTax,
        totalDiscount,
        avgOrderValue,
        customerCount,
        topProductId,
      },
      create: {
        tenantId: ctx.tenantId,
        date: dayStart,
        totalOrders,
        totalRevenue,
        totalTax,
        totalDiscount,
        avgOrderValue,
        customerCount,
        topProductId,
      },
    });

    return success(summary);
  }, [Role.ADMIN, Role.MANAGER]);
}
