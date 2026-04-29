import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody, ApiContext } from "@/lib/api-helpers";
import { updateOrderStatusSchema } from "@/lib/validations";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (ctx: ApiContext) => {
    const order = await prisma.order.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, image: true, isVeg: true } } },
        },
        table: true,
        customer: { select: { id: true, name: true, phone: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        kdsTickets: true,
      },
    });

    if (!order) return error("Order not found", 404);
    return success(order);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(async (ctx: ApiContext) => {
    const order = await prisma.order.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!order) return error("Order not found", 404);

    const body = await req.json();
    const validated = validateBody(updateOrderStatusSchema, body);
    if ("error" in validated) return error(validated.error);

    const { status } = validated.data;

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: { status },
      include: {
        items: true,
        table: true,
        customer: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Also update KDS ticket status
    await prisma.kdsTicket.updateMany({
      where: { orderId: params.id },
      data: {
        status,
        ...(status === "PREPARING" ? { startedAt: new Date() } : {}),
        ...(status === "COMPLETED" || status === "READY" ? { completedAt: new Date() } : {}),
      },
    });

    return success(updated);
  }, [Role.VENDOR, Role.MANAGER]);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async (ctx: ApiContext) => {
    const order = await prisma.order.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!order) return error("Order not found", 404);

    if (order.status === "COMPLETED") {
      return error("Cannot cancel a completed order", 400);
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });

    await prisma.kdsTicket.updateMany({
      where: { orderId: params.id },
      data: { status: "CANCELLED" },
    });

    return success(updated);
  }, [Role.VENDOR, Role.MANAGER]);
}
