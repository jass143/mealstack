import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withSuperAdmin, success, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

// GET /api/admin/brands — list all brands with outlet count
export async function GET() {
  return withSuperAdmin(async () => {
    const brands = await prisma.brand.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { outlets: true } },
      },
    });
    return success(
      brands.map((b) => ({
        id: b.id,
        name: b.name,
        createdAt: b.createdAt,
        owner: b.owner,
        outletCount: b._count.outlets,
      }))
    );
  });
}

// POST /api/admin/brands — create a brand and promote a User to BRAND_OWNER.
// Body: { name, ownerEmail, outletTenantId? }
//
// If outletTenantId is provided, the owner's existing tenant is also linked
// to the new brand (so the brand owner has at least one outlet — their own).
export async function POST(req: NextRequest) {
  return withSuperAdmin(async () => {
    const body = await req.json().catch(() => null);
    if (!body) return error("Invalid JSON body");

    const { name, ownerEmail, outletTenantId } = body as {
      name?: string;
      ownerEmail?: string;
      outletTenantId?: string | null;
    };

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return error("Brand name must be at least 2 characters");
    }
    if (!ownerEmail || typeof ownerEmail !== "string") {
      return error("ownerEmail is required");
    }

    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (!owner) return error("No user with that email", 404);
    if (owner.role === Role.SUPERADMIN) {
      return error("Cannot promote a SuperAdmin to a brand owner");
    }

    // One brand per owner (ownerUserId is unique on Brand)
    const existing = await prisma.brand.findUnique({ where: { ownerUserId: owner.id } });
    if (existing) return error("This user already owns a brand", 409);

    const brand = await prisma.$transaction(async (tx) => {
      const created = await tx.brand.create({
        data: {
          name: name.trim(),
          ownerUserId: owner.id,
        },
      });

      // Promote the owner user to BRAND_OWNER role.
      await tx.user.update({
        where: { id: owner.id },
        data: { role: Role.BRAND_OWNER },
      });

      // Optionally link the owner's existing tenant to this brand.
      if (outletTenantId) {
        const tenant = await tx.tenant.findUnique({ where: { id: outletTenantId } });
        if (tenant) {
          await tx.tenant.update({
            where: { id: outletTenantId },
            data: { brandId: created.id },
          });
        }
      } else if (owner.tenantId) {
        // Default behavior: link the owner's own tenant if they have one.
        await tx.tenant.update({
          where: { id: owner.tenantId },
          data: { brandId: created.id },
        });
      }

      return created;
    });

    return success(brand, 201);
  });
}
