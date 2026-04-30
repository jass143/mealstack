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

// PATCH /api/admin/brands/[id] — update name or commission rate
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withSuperAdmin(async () => {
    const body = await req.json().catch(() => null);
    if (!body) return error("Invalid JSON body");

    const data: { name?: string; commissionPercent?: number } = {};
    if (typeof body.name === "string" && body.name.trim().length >= 2) {
      data.name = body.name.trim();
    }
    if (body.commissionPercent !== undefined) {
      const pct = Number(body.commissionPercent);
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        return error("commissionPercent must be between 0 and 100");
      }
      data.commissionPercent = pct;
    }
    if (Object.keys(data).length === 0) return error("Nothing to update");

    const brand = await prisma.brand.update({ where: { id: params.id }, data });
    return success(brand);
  });
}

// DELETE /api/admin/brands/[id] — break up the brand.
// Outlets revert to independent (brandId set null via onDelete: SetNull).
// Owner is demoted back to VENDOR. Commission ledger entries remain for
// historical records but become orphans (the FK is CASCADE so they're cleaned).
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
