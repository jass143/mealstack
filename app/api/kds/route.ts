import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error } from "@/lib/api-helpers";

export async function GET(_req: NextRequest) {
  return withAuth(async (ctx) => {
    try {
      const tickets = await prisma.kdsTicket.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
          order: { tenantId: ctx.tenantId },
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              orderType: true,
              status: true,
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
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      });

      const mapped = tickets.map((ticket) => ({
        id: ticket.id,
        orderId: ticket.order.id,
        orderNumber: ticket.order.orderNumber,
        orderType: ticket.order.orderType,
        status: ticket.status,
        priority: ticket.priority,
        tableNumber: ticket.order.table?.number ?? null,
        notes: ticket.order.notes,
        items: ticket.order.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          qty: item.qty,
          notes: item.notes,
        })),
        createdAt: ticket.createdAt.toISOString(),
        startedAt: ticket.startedAt?.toISOString() ?? null,
        completedAt: ticket.completedAt?.toISOString() ?? null,
      }));

      return success(mapped);
    } catch (err) {
      console.error("KDS GET error:", err);
      return error("Failed to fetch KDS tickets", 500);
    }
  });
}
