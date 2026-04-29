import prisma from "@/lib/prisma";
import { withSuperAdmin, success } from "@/lib/api-helpers";

export async function GET() {
  return withSuperAdmin(async () => {
    const [orders, upiPayments] = await Promise.all([
      prisma.order.findMany({
        where: { paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { tenant: { select: { name: true, domain: true, currency: true } } },
      }),
      prisma.upiPayment.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { tenant: { select: { name: true, domain: true, currency: true } } },
      }),
    ]);

    const orderRows = orders.map((o) => ({
      id: o.id,
      source: "ORDER" as const,
      tenantName: o.tenant.name,
      tenantDomain: o.tenant.domain,
      method: o.paymentMethod ?? "—",
      amountCents: o.totalCents,
      currency: o.tenant.currency,
      status: o.paymentStatus,
      reference: `Order #${o.orderNumber}`,
      createdAt: o.createdAt.toISOString(),
    }));

    const upiRows = upiPayments.map((p) => ({
      id: p.id,
      source: "UPI" as const,
      tenantName: p.tenant.name,
      tenantDomain: p.tenant.domain,
      method: p.platform,
      amountCents: p.amountCents,
      currency: p.tenant.currency,
      status: p.status,
      reference: p.transactionId,
      createdAt: p.createdAt.toISOString(),
    }));

    // Merge + sort by createdAt desc, cap at 200
    const merged = [...orderRows, ...upiRows]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 200);

    return success(merged);
  });
}
