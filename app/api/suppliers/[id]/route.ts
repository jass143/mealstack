import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody } from "@/lib/api-helpers";
import { createSupplierSchema } from "@/lib/validations";
import { Role } from "@prisma/client";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    const supplier = await prisma.supplier.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
      include: {
        items: {
          where: { isActive: true },
          select: { id: true, name: true, sku: true, quantity: true, unit: true },
        },
        _count: { select: { items: true } },
      },
    });

    if (!supplier) return error("Supplier not found", 404);
    return success(supplier);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    const existing = await prisma.supplier.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!existing) return error("Supplier not found", 404);

    const body = await req.json();
    const validated = validateBody(createSupplierSchema.partial(), body);
    if ("error" in validated) return error(validated.error);

    const { data } = validated;

    // Check for duplicate name if changing name
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.supplier.findFirst({
        where: { tenantId: ctx.tenantId, name: data.name, id: { not: params.id } },
      });
      if (duplicate) return error("A supplier with this name already exists");
    }

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data,
    });

    return success(supplier);
  }, [Role.VENDOR, Role.MANAGER]);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    const existing = await prisma.supplier.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!existing) return error("Supplier not found", 404);

    // Check if supplier has active inventory items
    const activeItems = await prisma.inventoryItem.count({
      where: { supplierId: params.id, isActive: true },
    });
    if (activeItems > 0) {
      return error(
        `Cannot delete supplier with ${activeItems} active inventory item(s). Reassign or deactivate them first.`
      );
    }

    await prisma.supplier.delete({ where: { id: params.id } });
    return success({ message: "Supplier deleted" });
  }, [Role.VENDOR, Role.MANAGER]);
}
