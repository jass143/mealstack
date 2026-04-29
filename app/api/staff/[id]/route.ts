import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error, validateBody } from "@/lib/api-helpers";
import { updateStaffSchema } from "@/lib/validations";
import { Role } from "@prisma/client";

const STAFF_SELECT = {
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
} as const;

// GET /api/staff/[id] - Get single staff member
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (ctx) => {
    const staff = await prisma.user.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
      select: STAFF_SELECT,
    });

    if (!staff) return error("Staff member not found", 404);
    return success(staff);
  });
}

// PATCH /api/staff/[id] - Update staff member (ADMIN, MANAGER only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (ctx) => {
    const body = await req.json();
    const validation = validateBody(updateStaffSchema, body);
    if ("error" in validation) return error(validation.error);

    // Verify staff exists in this tenant
    const existing = await prisma.user.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!existing) return error("Staff member not found", 404);

    // Non-admins cannot change roles
    if (validation.data.role && ctx.role !== Role.VENDOR) {
      return error("Only admins can change roles", 403);
    }

    // Prevent changing own role unless ADMIN
    if (
      validation.data.role &&
      params.id === ctx.userId &&
      ctx.role !== Role.VENDOR
    ) {
      return error("Cannot change your own role", 403);
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: validation.data,
      select: STAFF_SELECT,
    });

    return success(updated);
  }, [Role.VENDOR]);
}

// DELETE /api/staff/[id] - Deactivate staff member (VENDOR only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (ctx) => {
    // Prevent self-deactivation
    if (params.id === ctx.userId) {
      return error("Cannot deactivate your own account", 400);
    }

    const existing = await prisma.user.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!existing) return error("Staff member not found", 404);

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
      select: STAFF_SELECT,
    });

    return success(updated);
  }, [Role.VENDOR]);
}
