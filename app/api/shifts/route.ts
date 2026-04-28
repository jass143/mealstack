import prisma from "@/lib/prisma";
import { withAuth, success } from "@/lib/api-helpers";
import { ShiftStatus } from "@prisma/client";

// GET /api/shifts - Get all active shifts for tenant (shift dashboard)
export async function GET() {
  return withAuth(async (ctx) => {
    const activeShifts = await prisma.shift.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: ShiftStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
            phone: true,
          },
        },
      },
      orderBy: { clockIn: "asc" },
    });

    return success(activeShifts);
  });
}
