import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAuth, success, error, ApiContext } from "@/lib/api-helpers";

type Params = { params: { id: string } };

// GET — get meal variant for a product
export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (ctx: ApiContext) => {
    const product = await prisma.product.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
      include: {
        mealProduct: { select: { id: true, name: true, priceCents: true, costCents: true, sku: true } },
      },
    });
    if (!product) return error("Product not found", 404);
    return success(product.mealProduct);
  });
}

// POST — create or update meal variant for a product
export async function POST(req: NextRequest, { params }: Params) {
  return withAuth(async (ctx: ApiContext) => {
    const product = await prisma.product.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
      include: { mealProduct: true },
    });
    if (!product) return error("Product not found", 404);

    const body = await req.json();
    const { priceCents, costCents } = body;

    if (!priceCents || typeof priceCents !== "number" || priceCents <= 0) {
      return error("Meal price is required and must be positive");
    }

    if (priceCents <= product.priceCents) {
      return error("Meal price must be higher than single price");
    }

    // If meal variant already exists, update it
    if (product.mealProduct) {
      const updated = await prisma.product.update({
        where: { id: product.mealProduct.id },
        data: {
          priceCents,
          costCents: costCents ?? product.mealProduct.costCents,
        },
      });
      return success(updated);
    }

    // Create new meal variant product
    const mealSku = product.sku ? `${product.sku}-MEAL` : null;

    const mealProduct = await prisma.product.create({
      data: {
        tenantId: ctx.tenantId,
        categoryId: product.categoryId,
        name: `${product.name} (Meal)`,
        sku: mealSku,
        priceCents,
        costCents: costCents ?? Math.round(product.costCents * 1.3),
        isVeg: product.isVeg,
        isActive: false, // hidden from menu, only shown via POS popup
        prepTimeMins: product.prepTimeMins,
      },
    });

    // Link to base product
    await prisma.product.update({
      where: { id: product.id },
      data: { mealProductId: mealProduct.id },
    });

    return success(mealProduct, 201);
  }, [Role.VENDOR, Role.MANAGER]);
}

// DELETE — remove meal variant from a product
export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async (ctx: ApiContext) => {
    const product = await prisma.product.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
      include: { mealProduct: true },
    });
    if (!product) return error("Product not found", 404);
    if (!product.mealProduct) return error("Product has no meal variant", 404);

    // Unlink
    await prisma.product.update({
      where: { id: product.id },
      data: { mealProductId: null },
    });

    // Delete the meal product
    await prisma.product.delete({
      where: { id: product.mealProduct.id },
    });

    return success({ message: "Meal variant removed" });
  }, [Role.VENDOR, Role.MANAGER]);
}
