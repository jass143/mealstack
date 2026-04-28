import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error, ApiContext, parsePagination } from "@/lib/api-helpers";

// GET - UPI payment history with today's total and filters
export async function GET(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const { searchParams } = new URL(req.url);
    const { limit, skip } = parsePagination(searchParams);

    const platform = searchParams.get("platform"); // PAYTM, GOOGLE_PAY, PHONE_PE
    const status = searchParams.get("status"); // SUCCESS, FAILED, PENDING
    const date = searchParams.get("date"); // YYYY-MM-DD — filter by specific date
    const from = searchParams.get("from"); // YYYY-MM-DD
    const to = searchParams.get("to"); // YYYY-MM-DD

    // Build where clause
    const where: any = { tenantId: ctx.tenantId };

    if (platform && ["PAYTM", "GOOGLE_PAY", "PHONE_PE"].includes(platform)) {
      where.platform = platform;
    }
    if (status) {
      where.status = status;
    }

    // Date filtering
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      where.receivedAt = { gte: dayStart, lte: dayEnd };
    } else if (from || to) {
      where.receivedAt = {};
      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        where.receivedAt.gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.receivedAt.lte = toDate;
      }
    }

    // Fetch payments
    const [payments, total] = await Promise.all([
      prisma.upiPayment.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip,
        take: limit,
        include: {
          order: {
            select: { id: true, orderNumber: true, totalCents: true },
          },
        },
      }),
      prisma.upiPayment.count({ where }),
    ]);

    // Today's totals (always calculated regardless of filters)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayPayments = await prisma.upiPayment.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: "SUCCESS",
        receivedAt: { gte: todayStart, lte: todayEnd },
      },
      select: { amountCents: true, platform: true },
    });

    const todayTotal = todayPayments.reduce((sum, p) => sum + p.amountCents, 0);
    const todayCount = todayPayments.length;

    // Per-platform breakdown for today
    const todayByPlatform = {
      PAYTM: { count: 0, amountCents: 0 },
      GOOGLE_PAY: { count: 0, amountCents: 0 },
      PHONE_PE: { count: 0, amountCents: 0 },
    };
    for (const p of todayPayments) {
      todayByPlatform[p.platform].count++;
      todayByPlatform[p.platform].amountCents += p.amountCents;
    }

    return success({
      payments,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      today: {
        totalAmountCents: todayTotal,
        totalAmountRupees: (todayTotal / 100).toFixed(2),
        count: todayCount,
        byPlatform: todayByPlatform,
      },
    });
  });
}
