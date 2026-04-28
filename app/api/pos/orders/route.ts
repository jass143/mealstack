import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody, ApiContext } from "@/lib/api-helpers";
import { createOrderSchema } from "@/lib/validations";
import { emitToTenant } from "@/lib/socket-client";

export async function GET(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { tenantId: ctx.tenantId };
    if (status && status !== "ALL") {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          table: true,
          customer: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return success({
      orders,
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
  return withAuth(async (ctx: ApiContext) => {
    const body = await req.json();
    const validated = validateBody(createOrderSchema, body);
    if ("error" in validated) return error(validated.error);

    const { items, tableId, customerId, orderType, notes } = validated.data;

    // Look up product prices from DB (deduplicate IDs for variant orders)
    const uniqueProductIds = [...new Set(items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds },
        tenantId: ctx.tenantId,
      },
      include: { ingredients: true },
    });

    if (products.length !== uniqueProductIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missing = uniqueProductIds.filter((id) => !foundIds.has(id));
      return error(`Products not found or inactive: ${missing.join(", ")}`, 404);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate table belongs to tenant if provided
    if (tableId) {
      const table = await prisma.restaurantTable.findFirst({
        where: { id: tableId, tenantId: ctx.tenantId },
      });
      if (!table) return error("Table not found", 404);
    }

    // Validate customer belongs to tenant if provided
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, tenantId: ctx.tenantId },
      });
      if (!customer) return error("Customer not found", 404);
    }

    // Get tenant tax rate
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { taxRate: true },
    });
    if (!tenant) return error("Tenant not found", 404);

    // Calculate totals
    let subtotalCents = 0;
    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      // Use variant price if provided, otherwise use product base price
      const unitPrice = item.priceCents ?? product.priceCents;
      const displayName = item.variantName
        ? `${product.name} (${item.variantName})`
        : product.name;
      const lineTotal = unitPrice * item.qty;
      subtotalCents += lineTotal;
      return {
        productId: item.productId,
        productName: displayName,
        qty: item.qty,
        unitPrice,
        notes: item.notes || null,
      };
    });

    const taxCents = Math.round(subtotalCents * (tenant.taxRate / 100));
    const totalCents = subtotalCents + taxCents;

    // Auto-generate order number: get max for tenant and increment
    const lastOrder = await prisma.order.findFirst({
      where: { tenantId: ctx.tenantId },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    const orderNumber = (lastOrder?.orderNumber || 0) + 1;

    // Create order, order items, KDS ticket, and deduct inventory in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          tenantId: ctx.tenantId,
          orderNumber,
          tableId: tableId || null,
          customerId: customerId || null,
          createdById: ctx.userId,
          orderType: orderType || "DINE_IN",
          status: "PENDING",
          subtotalCents,
          taxCents,
          totalCents,
          notes: notes || null,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
          table: true,
          customer: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // Create KDS ticket
      await tx.kdsTicket.create({
        data: {
          orderId: newOrder.id,
          status: "PENDING",
          priority: 0,
        },
      });

      // Deduct inventory via ProductIngredient
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        for (const ingredient of product.ingredients) {
          const totalQty = ingredient.quantityNeeded * item.qty;

          await tx.inventoryItem.update({
            where: { id: ingredient.inventoryItemId },
            data: { quantity: { decrement: totalQty } },
          });

          await tx.inventoryTransaction.create({
            data: {
              tenantId: ctx.tenantId,
              inventoryItemId: ingredient.inventoryItemId,
              type: "USAGE",
              quantity: -totalQty,
              notes: `Order #${orderNumber} - ${product.name} x${item.qty}`,
            },
          });
        }
      }

      // Update customer stats if provided
      if (customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalVisits: { increment: 1 },
          },
        });
      }

      return newOrder;
    });

    // Emit socket event for KDS (fire-and-forget)
    emitToTenant(ctx.tenantId, "kds:new-order", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      items: order.items,
      orderType: order.orderType,
    }).catch(() => {
      // Socket emit is best-effort
    });

    return success(order, 201);
  }, [Role.ADMIN, Role.MANAGER, Role.CASHIER]);
}
