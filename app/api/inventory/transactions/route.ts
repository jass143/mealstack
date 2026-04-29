import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody } from "@/lib/api-helpers";
import { inventoryTransactionSchema } from "@/lib/validations";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  return withAuth(async (ctx) => {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const where = {
      tenantId: ctx.tenantId,
      ...(itemId ? { inventoryItemId: itemId } : {}),
    };

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        include: { inventoryItem: { select: { id: true, name: true, unit: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.inventoryTransaction.count({ where }),
    ]);

    return success({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (ctx) => {
    const body = await req.json();
    const validated = validateBody(inventoryTransactionSchema, body);
    if ("error" in validated) return error(validated.error);

    const { data } = validated;

    // Verify the inventory item belongs to this tenant
    const item = await prisma.inventoryItem.findFirst({
      where: { id: data.inventoryItemId, tenantId: ctx.tenantId },
    });
    if (!item) return error("Inventory item not found", 404);

    // Calculate new quantity
    let newQuantity: number;
    switch (data.type) {
      case "PURCHASE":
      case "RETURN":
        newQuantity = item.quantity + Math.abs(data.quantity);
        break;
      case "USAGE":
      case "WASTE":
        newQuantity = item.quantity - Math.abs(data.quantity);
        if (newQuantity < 0) {
          return error(
            `Insufficient stock. Current quantity: ${item.quantity} ${item.unit}`
          );
        }
        break;
      case "ADJUSTMENT":
        // Adjustment sets absolute quantity
        if (data.quantity < 0) {
          return error("Adjustment quantity must be non-negative");
        }
        newQuantity = data.quantity;
        break;
      default:
        return error("Invalid transaction type");
    }

    // Use a transaction to ensure atomicity
    const [transaction] = await prisma.$transaction([
      prisma.inventoryTransaction.create({
        data: {
          tenantId: ctx.tenantId,
          inventoryItemId: data.inventoryItemId,
          type: data.type,
          quantity: data.quantity,
          notes: data.notes,
        },
        include: {
          inventoryItem: { select: { id: true, name: true, unit: true } },
        },
      }),
      prisma.inventoryItem.update({
        where: { id: data.inventoryItemId },
        data: { quantity: newQuantity },
      }),
    ]);

    return success(transaction, 201);
  }, [Role.VENDOR, Role.MANAGER]);
}
