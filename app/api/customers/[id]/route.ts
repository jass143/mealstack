import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody } from "@/lib/api-helpers";
import { updateCustomerSchema } from "@/lib/validations";

// GET /api/customers/[id] - Get single customer with recent orders
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (ctx) => {
    const customer = await prisma.customer.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!customer) return error("Customer not found", 404);

    const recentOrders = await prisma.order.findMany({
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
      take: 10,
    });

    return success({ ...customer, recentOrders });
  });
}

// PATCH /api/customers/[id] - Update customer
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (ctx) => {
    const body = await req.json();
    const validation = validateBody(updateCustomerSchema, body);
    if ("error" in validation) return error(validation.error);

    const existing = await prisma.customer.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!existing) return error("Customer not found", 404);

    // If phone is being changed, check for duplicates
    if (validation.data.phone && validation.data.phone !== existing.phone) {
      const duplicate = await prisma.customer.findFirst({
        where: {
          tenantId: ctx.tenantId,
          phone: validation.data.phone,
          id: { not: params.id },
        },
      });
      if (duplicate) {
        return error("A customer with this phone number already exists", 409);
      }
    }

    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: validation.data,
    });

    return success(updated);
  });
}

// DELETE /api/customers/[id] - Remove customer
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (ctx) => {
    const existing = await prisma.customer.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!existing) return error("Customer not found", 404);

    await prisma.customer.delete({ where: { id: params.id } });

    return success({ message: "Customer deleted" });
  });
}
