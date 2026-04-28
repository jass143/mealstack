import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error } from "@/lib/api-helpers";
import { ShiftStatus } from "@prisma/client";

// GET /api/staff/[id]/shifts - Get shifts for a specific staff member
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (ctx) => {
    // Verify staff exists in tenant
    const staff = await prisma.user.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!staff) return error("Staff member not found", 404);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const [shifts, total] = await Promise.all([
      prisma.shift.findMany({
        where: { userId: params.id, tenantId: ctx.tenantId },
        orderBy: { clockIn: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.shift.count({
        where: { userId: params.id, tenantId: ctx.tenantId },
      }),
    ]);

    return success({ shifts, total });
  });
}

// POST /api/staff/[id]/shifts - Clock in (create shift with ACTIVE status)
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (ctx) => {
    // Verify staff exists in tenant
    const staff = await prisma.user.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    });
    if (!staff) return error("Staff member not found", 404);

    // Check if staff already has an active shift
    const activeShift = await prisma.shift.findFirst({
      where: {
        userId: params.id,
        tenantId: ctx.tenantId,
        status: ShiftStatus.ACTIVE,
      },
    });
    if (activeShift) {
      return error("Staff member already has an active shift", 409);
    }

    const shift = await prisma.shift.create({
      data: {
        tenantId: ctx.tenantId,
        userId: params.id,
        status: ShiftStatus.ACTIVE,
        clockIn: new Date(),
      },
    });

    return success(shift, 201);
  });
}

// PATCH /api/staff/[id]/shifts - Clock out (update active shift)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (ctx) => {
    const body = await req.json().catch(() => ({}));
    const breakMins = typeof body.breakMins === "number" ? body.breakMins : undefined;

    // Find active shift for this staff member
    const activeShift = await prisma.shift.findFirst({
      where: {
        userId: params.id,
        tenantId: ctx.tenantId,
        status: ShiftStatus.ACTIVE,
      },
    });
    if (!activeShift) {
      return error("No active shift found for this staff member", 404);
    }

    const shift = await prisma.shift.update({
      where: { id: activeShift.id },
      data: {
        clockOut: new Date(),
        status: ShiftStatus.COMPLETED,
        ...(breakMins !== undefined && { breakMins }),
      },
    });

    return success(shift);
  });
}
