import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody, ApiContext } from "@/lib/api-helpers";
import { createProductSchema } from "@/lib/validations";

export async function GET(_req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const products = await prisma.product.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      include: {
        category: { select: { id: true, name: true } },
        mealProduct: { select: { id: true, name: true, priceCents: true } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, priceCents: true, sortOrder: true } },
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    });

    return success(products);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const body = await req.json();
    const validated = validateBody(createProductSchema, body);
    if ("error" in validated) return error(validated.error);

    const data = validated.data;

    // Validate category belongs to tenant if provided
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: data.categoryId, tenantId: ctx.tenantId },
      });
      if (!category) return error("Category not found", 404);
    }

    // Check SKU uniqueness within tenant
    if (data.sku) {
      const existing = await prisma.product.findFirst({
        where: { tenantId: ctx.tenantId, sku: data.sku },
      });
      if (existing) return error("A product with this SKU already exists", 409);
    }

    const product = await prisma.product.create({
      data: {
        tenantId: ctx.tenantId,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        sku: data.sku,
        priceCents: data.priceCents,
        costCents: data.costCents ?? 0,
        image: data.image,
        isVeg: data.isVeg ?? false,
        prepTimeMins: data.prepTimeMins ?? 15,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return success(product, 201);
  }, [Role.VENDOR, Role.MANAGER, Role.BRAND_OWNER]);
}
