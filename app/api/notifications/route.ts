import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error, ApiContext } from "@/lib/api-helpers";

export async function GET(_req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const notifications = await prisma.notification.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return success(notifications);
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const body = await req.json();
    const { action } = body;

    if (action === "mark-all-read") {
      await prisma.notification.updateMany({
        where: { tenantId: ctx.tenantId, isRead: false },
        data: { isRead: true },
      });
      return success({ message: "All notifications marked as read" });
    }

    if (action === "mark-read" && body.id) {
      const notification = await prisma.notification.findFirst({
        where: { id: body.id, tenantId: ctx.tenantId },
      });
      if (!notification) return error("Notification not found", 404);

      await prisma.notification.update({
        where: { id: body.id },
        data: { isRead: true },
      });
      return success({ message: "Notification marked as read" });
    }

    return error("Invalid action");
  });
}
