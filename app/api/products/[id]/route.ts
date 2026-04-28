import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody, ApiContext } from "@/lib/api-helpers";
import { updateProductSchema } from "@/lib/validations";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (ctx: ApiContext) => {
    const product = await prisma.product.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
      include: {
        category: { select: { id: true, name: true } },
        ingredients: {
          include: { inventoryItem: { select: { id: true, name: true, unit: true } } },
        },
      },
    });

    if (!product) return error("Product not found", 404);
    return success(product);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(async (ctx: ApiContext) => {
    const product = await prisma.product.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!product) return error("Product not found", 404);

    const body = await req.json();
    const validated = validateBody(updateProductSchema, body);
    if ("error" in validated) return error(validated.error);

    const data = validated.data;

    // Validate category if being changed
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: data.categoryId, tenantId: ctx.tenantId },
      });
      if (!category) return error("Category not found", 404);
    }

    // Check SKU uniqueness if being changed
    if (data.sku && data.sku !== product.sku) {
      const existing = await prisma.product.findFirst({
        where: { tenantId: ctx.tenantId, sku: data.sku, NOT: { id: params.id } },
      });
      if (existing) return error("A product with this SKU already exists", 409);
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data,
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return success(updated);
  }, [Role.ADMIN, Role.MANAGER]);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async (ctx: ApiContext) => {
    const product = await prisma.product.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!product) return error("Product not found", 404);

    // Soft delete by deactivating
    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return success({ message: "Product deactivated" });
  }, [Role.ADMIN, Role.MANAGER]);
}
