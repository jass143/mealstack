import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error } from "@/lib/api-helpers";
import { emitToTenant } from "@/lib/socket-client";
import { OrderStatus, Role } from "@prisma/client";

const ALLOWED_TRANSITIONS: Record<string, OrderStatus[]> = {
  PENDING: ["PREPARING", "CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "PREPARING"],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (ctx) => {
    try {
      const { id } = params;
      const body = await req.json();
      const { status } = body as { status: OrderStatus };

      if (!status) {
        return error("status is required");
      }

      // Fetch the ticket and verify it belongs to this tenant
      const ticket = await prisma.kdsTicket.findUnique({
        where: { id },
        include: { order: { select: { id: true, tenantId: true, orderNumber: true } } },
      });

      if (!ticket) {
        return error("Ticket not found", 404);
      }

      if (ticket.order.tenantId !== ctx.tenantId) {
        return error("Forbidden", 403);
      }

      // Validate the status transition
      const allowed = ALLOWED_TRANSITIONS[ticket.status];
      if (!allowed || !allowed.includes(status)) {
        return error(
          `Cannot transition from ${ticket.status} to ${status}`,
          422
        );
      }

      // Build the ticket update data
      const ticketUpdate: Record<string, unknown> = { status };

      if (status === "PREPARING") {
        ticketUpdate.startedAt = new Date();
      }
      if (status === "READY") {
        ticketUpdate.completedAt = new Date();
      }

      // Update both ticket and order status in a transaction
      const [updatedTicket] = await prisma.$transaction([
        prisma.kdsTicket.update({
          where: { id },
          data: ticketUpdate,
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                orderType: true,
                notes: true,
                createdAt: true,
                table: { select: { number: true } },
                items: {
                  select: {
                    id: true,
                    productName: true,
                    qty: true,
                    notes: true,
                  },
                },
              },
            },
          },
        }),
        prisma.order.update({
          where: { id: ticket.order.id },
          data: { status },
        }),
      ]);

      const payload = {
        id: updatedTicket.id,
        orderId: updatedTicket.order.id,
        orderNumber: updatedTicket.order.orderNumber,
        orderType: updatedTicket.order.orderType,
        status: updatedTicket.status,
        priority: updatedTicket.priority,
        tableNumber: updatedTicket.order.table?.number ?? null,
        notes: updatedTicket.order.notes,
        items: updatedTicket.order.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          qty: item.qty,
          notes: item.notes,
        })),
        createdAt: updatedTicket.createdAt.toISOString(),
        startedAt: updatedTicket.startedAt?.toISOString() ?? null,
        completedAt: updatedTicket.completedAt?.toISOString() ?? null,
      };

      // Broadcast to the tenant's KDS room
      try {
        await emitToTenant(ctx.tenantId, "kds:update", payload);
      } catch (err) {
        console.error("Failed to emit kds:update", err);
      }

      return success(payload);
    } catch (err) {
      console.error("KDS PATCH error:", err);
      return error("Failed to update ticket", 500);
    }
  }, [Role.VENDOR, Role.MANAGER]);
}
