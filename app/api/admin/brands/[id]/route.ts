import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withSuperAdmin, success, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

// GET /api/admin/brands/[id] — full brand detail with linked outlets
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return withSuperAdmin(async () => {
    const brand = await prisma.brand.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        outlets: {
          select: {
            id: true,
            name: true,
            domain: true,
            createdAt: true,
            _count: { select: { orders: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!brand) return error("Brand not found", 404);
    return success(brand);
  });
}

// PATCH /api/admin/brands/[id] — rename
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withSuperAdmin(async () => {
    const body = await req.json().catch(() => null);
    if (!body) return error("Invalid JSON body");

    if (typeof body.name !== "string" || body.name.trim().length < 2) {
      return error("Brand name must be at least 2 characters");
    }

    const brand = await prisma.brand.update({
      where: { id: params.id },
      data: { name: body.name.trim() },
    });
    return success(brand);
  });
}

// DELETE /api/admin/brands/[id] — break up the brand.
// Outlets revert to independent (brandId set null via onDelete: SetNull).
// Owner is demoted back to VENDOR.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return withSuperAdmin(async () => {
    const brand = await prisma.brand.findUnique({ where: { id: params.id } });
    if (!brand) return error("Brand not found", 404);

    await prisma.$transaction(async (tx) => {
      await tx.brand.delete({ where: { id: params.id } });
      await tx.user.update({
        where: { id: brand.ownerUserId },
        data: { role: Role.VENDOR },
      });
    });

    return success({ ok: true });
  });
}
