import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error } from "@/lib/api-helpers";

// GET /api/customers/[id]/orders - Paginated order history for customer
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (ctx) => {
    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!customer) return error("Customer not found", 404);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId: params.id, tenantId: ctx.tenantId },
        include: {
          items: {
            select: {
              id: true,
              productName: true,
              qty: true,
              unitPrice: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({
        where: { customerId: params.id, tenantId: ctx.tenantId },
      }),
    ]);

    return success({ orders, total });
  });
}
