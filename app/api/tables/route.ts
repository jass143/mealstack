import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody, ApiContext } from "@/lib/api-helpers";
import { createTableSchema } from "@/lib/validations";

export async function GET(_req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const tables = await prisma.restaurantTable.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      orderBy: { number: "asc" },
      include: {
        orders: {
          where: {
            status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED"] },
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalCents: true,
            createdAt: true,
            _count: { select: { items: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return success(tables);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const body = await req.json();
    const validated = validateBody(createTableSchema, body);
    if ("error" in validated) return error(validated.error);

    const data = validated.data;

    const existing = await prisma.restaurantTable.findFirst({
      where: { tenantId: ctx.tenantId, number: data.number },
    });
    if (existing) return error("A table with this number already exists", 409);

    const table = await prisma.restaurantTable.create({
      data: {
        tenantId: ctx.tenantId,
        number: data.number,
        capacity: data.capacity ?? 4,
      },
    });

    return success(table, 201);
  }, [Role.ADMIN, Role.MANAGER]);
}
