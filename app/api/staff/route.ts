import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody } from "@/lib/api-helpers";
import { createStaffSchema } from "@/lib/validations";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";

// GET /api/staff - List all staff for tenant
export async function GET() {
  return withAuth(async (ctx) => {
    const staff = await prisma.user.findMany({
      where: { tenantId: ctx.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return success(staff);
  });
}

// POST /api/staff - Create new staff member (VENDOR only — only Managers can be created)
export async function POST(req: NextRequest) {
  return withAuth(async (ctx) => {
    const body = await req.json();
    const validation = validateBody(createStaffSchema, body);
    if ("error" in validation) return error(validation.error);

    const { name, email, password, role, phone } = validation.data;

    // Email is globally unique across the platform
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return error("This email is already in use", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        tenantId: ctx.tenantId,
        name,
        email,
        hashedPassword,
        role: role as Role,
        phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return success(user, 201);
  }, [Role.VENDOR]);
}
