import prisma from "@/lib/prisma";
import { withAuth, success, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET() {
  return withAuth(async (ctx) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        name: true,
        domain: true,
        address: true,
        phone: true,
        email: true,
        currency: true,
        taxRate: true,
        timezone: true,
        logo: true,
      },
    });
    if (!tenant) return error("Tenant not found", 404);
    return success(tenant);
  });
}

export async function PATCH(req: Request) {
  return withAuth(async (ctx) => {
    const body = await req.json();
    const { name, address, phone, email, currency, taxRate, timezone } = body;

    const tenant = await prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(currency !== undefined && { currency }),
        ...(taxRate !== undefined && { taxRate: Number(taxRate) }),
        ...(timezone !== undefined && { timezone }),
      },
      select: {
        name: true,
        domain: true,
        address: true,
        phone: true,
        email: true,
        currency: true,
        taxRate: true,
        timezone: true,
      },
    });

    return success(tenant);
  }, [Role.VENDOR, Role.BRAND_OWNER]);
}
