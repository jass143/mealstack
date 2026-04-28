import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody } from "@/lib/api-helpers";
import { updateInventoryItemSchema } from "@/lib/validations";
import { Role } from "@prisma/client";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
      include: {
        supplier: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!item) return error("Inventory item not found", 404);
    return success(item);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    const existing = await prisma.inventoryItem.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!existing) return error("Inventory item not found", 404);

    const body = await req.json();
    const validated = validateBody(updateInventoryItemSchema, body);
    if ("error" in validated) return error(validated.error);

    const { data } = validated;

    // Verify supplier belongs to tenant if changing supplier
    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, tenantId: ctx.tenantId },
      });
      if (!supplier) return error("Supplier not found", 404);
    }

    // Check for duplicate SKU if changing SKU
    if (data.sku && data.sku !== existing.sku) {
      const duplicate = await prisma.inventoryItem.findFirst({
        where: { tenantId: ctx.tenantId, sku: data.sku, id: { not: params.id } },
      });
      if (duplicate) return error("An item with this SKU already exists");
    }

    const item = await prisma.inventoryItem.update({
      where: { id: params.id },
      data,
      include: { supplier: true },
    });

    return success(item);
  }, [Role.ADMIN, Role.MANAGER]);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withAuth(async (ctx) => {
    const existing = await prisma.inventoryItem.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!existing) return error("Inventory item not found", 404);

    // Soft delete - deactivate
    const item = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return success(item);
  }, [Role.ADMIN, Role.MANAGER]);
}
