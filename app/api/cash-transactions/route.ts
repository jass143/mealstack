import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAuth, success, error, ApiContext } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["EXPENSE", "WITHDRAWAL", "TOP_UP"]),
  amountCents: z.number().int().positive(),
  description: z.string().min(1),
  category: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const where: Record<string, unknown> = { tenantId: ctx.tenantId };
    if (type) where.type = type;

    const transactions = await prisma.cashTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        createdBy: { select: { name: true } },
      },
    });

    return success(transactions);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return error(parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "));
    }

    const data = parsed.data;

    const transaction = await prisma.cashTransaction.create({
      data: {
        tenantId: ctx.tenantId,
        createdById: ctx.userId,
        type: data.type,
        amountCents: data.amountCents,
        description: data.description,
        category: data.category,
      },
      include: {
        createdBy: { select: { name: true } },
      },
    });

    return success(transaction, 201);
  }, [Role.ADMIN, Role.MANAGER, Role.CASHIER]);
}

export async function DELETE(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return error("Missing id");

    const existing = await prisma.cashTransaction.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!existing) return error("Transaction not found", 404);

    await prisma.cashTransaction.delete({ where: { id } });
    return success({ message: "Deleted" });
  }, [Role.ADMIN, Role.MANAGER]);
}
