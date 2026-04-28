import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody, ApiContext } from "@/lib/api-helpers";
import { createCategorySchema } from "@/lib/validations";

export async function GET(_req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const categories = await prisma.category.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    });

    return success(categories);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const body = await req.json();
    const validated = validateBody(createCategorySchema, body);
    if ("error" in validated) return error(validated.error);

    const data = validated.data;

    // Check name uniqueness within tenant
    const existing = await prisma.category.findFirst({
      where: { tenantId: ctx.tenantId, name: data.name },
    });
    if (existing) return error("A category with this name already exists", 409);

    const category = await prisma.category.create({
      data: {
        tenantId: ctx.tenantId,
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    return success(category, 201);
  }, [Role.ADMIN, Role.MANAGER]);
}
