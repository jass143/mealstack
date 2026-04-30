import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withSuperAdmin, success, error } from "@/lib/api-helpers";

// POST /api/admin/brands/[id]/outlets — link an existing tenant to this brand
// Body: { tenantId }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withSuperAdmin(async () => {
    const body = await req.json().catch(() => null);
    const tenantId: string | undefined = body?.tenantId;
    if (!tenantId) return error("tenantId is required");

    const brand = await prisma.brand.findUnique({ where: { id: params.id } });
    if (!brand) return error("Brand not found", 404);

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return error("Tenant not found", 404);
    if (tenant.brandId && tenant.brandId !== params.id) {
      return error("This outlet is already linked to another brand", 409);
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { brandId: params.id },
      select: { id: true, name: true, domain: true, brandId: true },
    });

    return success(updated);
  });
}

// DELETE /api/admin/brands/[id]/outlets?tenantId=... — unlink an outlet from the brand
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withSuperAdmin(async () => {
    const tenantId = req.nextUrl.searchParams.get("tenantId");
    if (!tenantId) return error("tenantId query param required");

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return error("Tenant not found", 404);
    if (tenant.brandId !== params.id) {
      return error("Tenant is not linked to this brand", 400);
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { brandId: null },
    });

    return success({ ok: true });
  });
}
