import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody } from "@/lib/api-helpers";
import { createInventoryItemSchema } from "@/lib/validations";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  return withAuth(async (ctx) => {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const lowStock = searchParams.get("lowStock") === "true";

    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId: ctx.tenantId,
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { sku: { contains: search } },
              ],
            }
          : {}),
      },
      include: { supplier: true },
      orderBy: { name: "asc" },
    });

    // Prisma cannot compare two columns directly, so filter in application
    const result = lowStock
      ? items.filter((item) => item.quantity <= item.reorderLevel)
      : items;

    return success(result);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (ctx) => {
    const body = await req.json();
    const validated = validateBody(createInventoryItemSchema, body);
    if ("error" in validated) return error(validated.error);

    const { data } = validated;

    // Verify supplier belongs to tenant if provided
    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, tenantId: ctx.tenantId },
      });
      if (!supplier) return error("Supplier not found", 404);
    }

    // Check for duplicate SKU within tenant
    if (data.sku) {
      const existing = await prisma.inventoryItem.findFirst({
        where: { tenantId: ctx.tenantId, sku: data.sku },
      });
      if (existing) return error("An item with this SKU already exists");
    }

    const item = await prisma.inventoryItem.create({
      data: {
        tenantId: ctx.tenantId,
        name: data.name,
        sku: data.sku,
        quantity: data.quantity ?? 0,
        unit: data.unit ?? "pcs",
        reorderLevel: data.reorderLevel ?? 0,
        costPerUnit: data.costPerUnit ?? 0,
        supplierId: data.supplierId,
      },
      include: { supplier: true },
    });

    return success(item, 201);
  }, [Role.ADMIN, Role.MANAGER]);
}
