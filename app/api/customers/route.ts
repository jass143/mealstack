import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody } from "@/lib/api-helpers";
import { createCustomerSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

// GET /api/customers - List customers for tenant
export async function GET(req: NextRequest) {
  return withAuth(async (ctx) => {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Prisma.CustomerWhereInput = {
      tenantId: ctx.tenantId,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    };

    // Validate sort field
    const allowedSortFields = ["totalSpent", "totalVisits", "createdAt", "name", "loyaltyPoints"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        take: limit,
        skip: offset,
      }),
      prisma.customer.count({ where }),
    ]);

    return success({ customers, total });
  });
}

// POST /api/customers - Create new customer
export async function POST(req: NextRequest) {
  return withAuth(async (ctx) => {
    const body = await req.json();
    const validation = validateBody(createCustomerSchema, body);
    if ("error" in validation) return error(validation.error);

    const { name, email, phone, address, notes } = validation.data;

    // Check for duplicate phone within tenant if provided
    if (phone) {
      const existing = await prisma.customer.findFirst({
        where: { tenantId: ctx.tenantId, phone },
      });
      if (existing) {
        return error("A customer with this phone number already exists", 409);
      }
    }

    const customer = await prisma.customer.create({
      data: {
        tenantId: ctx.tenantId,
        name,
        email,
        phone,
        address,
        notes,
      },
    });

    return success(customer, 201);
  });
}
