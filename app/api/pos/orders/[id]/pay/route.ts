import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody, ApiContext } from "@/lib/api-helpers";
import { processPaymentSchema } from "@/lib/validations";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  return withAuth(async (ctx: ApiContext) => {
    const order = await prisma.order.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
      include: { customer: true },
    });
    if (!order) return error("Order not found", 404);

    if (order.paymentStatus === "PAID") {
      return error("Order is already paid", 400);
    }

    if (order.status === "CANCELLED") {
      return error("Cannot pay for a cancelled order", 400);
    }

    const body = await req.json();
    const validated = validateBody(processPaymentSchema, body);
    if ("error" in validated) return error(validated.error);

    const { paymentMethod, discountCents } = validated.data;

    // Recalculate total if discount is applied
    const discount = discountCents || 0;
    const newTotal = Math.max(0, order.totalCents - discount);

    // Resolve the tenant's brand once, so we can write a commission ledger
    // entry inside the same transaction that marks the order paid.
    const tenantWithBrand = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { brandId: true, brand: { select: { commissionPercent: true } } },
    });

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: params.id },
        data: {
          paymentMethod,
          paymentStatus: "PAID",
          status: "COMPLETED",
          discountCents: discount,
          totalCents: newTotal,
        },
        include: {
          items: true,
          table: true,
          customer: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // Update customer totalSpent and totalVisits if linked
      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            totalSpent: { increment: newTotal },
          },
        });
      }

      // Update KDS ticket to completed
      await tx.kdsTicket.updateMany({
        where: { orderId: params.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      // If this tenant belongs to a brand with a non-zero commission, log
      // the commission entry. orderId is unique on the ledger, so re-runs
      // (e.g., refund/repay) won't double-charge.
      if (tenantWithBrand?.brandId && tenantWithBrand.brand?.commissionPercent) {
        const pct = tenantWithBrand.brand.commissionPercent;
        const amountCents = Math.round((newTotal * pct) / 100);
        if (amountCents > 0) {
          await tx.commissionLedger.upsert({
            where: { orderId: params.id },
            update: { amountCents },
            create: {
              brandId: tenantWithBrand.brandId,
              tenantId: ctx.tenantId,
              orderId: params.id,
              amountCents,
            },
          });
        }
      }

      return updatedOrder;
    });

    return success(updated);
  }, [Role.VENDOR, Role.MANAGER, Role.BRAND_OWNER]);
}
