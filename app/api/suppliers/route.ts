import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody } from "@/lib/api-helpers";
import { createSupplierSchema } from "@/lib/validations";
import { Role } from "@prisma/client";

export async function GET(_req: NextRequest) {
  return withAuth(async (ctx) => {
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId: ctx.tenantId },
      include: { _count: { select: { items: true } } },
      orderBy: { name: "asc" },
    });

    return success(suppliers);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (ctx) => {
    const body = await req.json();
    const validated = validateBody(createSupplierSchema, body);
    if ("error" in validated) return error(validated.error);

    const { data } = validated;

    // Check for duplicate name within tenant
    const existing = await prisma.supplier.findFirst({
      where: { tenantId: ctx.tenantId, name: data.name },
    });
    if (existing) return error("A supplier with this name already exists");

    const supplier = await prisma.supplier.create({
      data: {
        tenantId: ctx.tenantId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
      },
    });

    return success(supplier, 201);
  }, [Role.ADMIN, Role.MANAGER]);
}
