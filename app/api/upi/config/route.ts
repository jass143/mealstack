import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error, ApiContext, validateBody } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { z } from "zod";

const upiConfigSchema = z.object({
  platform: z.enum(["PAYTM", "GOOGLE_PAY", "PHONE_PE"]),
  upiId: z.string().min(3, "UPI ID is required"),
  label: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET - List all UPI configs for this tenant
export async function GET(_req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const configs = await prisma.upiConfig.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { platform: "asc" },
    });
    return success(configs);
  });
}

// POST - Add or update a UPI config (upsert by platform)
export async function POST(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    try {
      const body = await req.json();
      const validation = validateBody(upiConfigSchema, body);
      if ("error" in validation) return error(validation.error);

      const { platform, upiId, label, isActive } = validation.data;

      const config = await prisma.upiConfig.upsert({
        where: {
          tenantId_platform: { tenantId: ctx.tenantId, platform },
        },
        update: {
          upiId,
          label: label || null,
          isActive: isActive ?? true,
        },
        create: {
          tenantId: ctx.tenantId,
          platform,
          upiId,
          label: label || null,
          isActive: isActive ?? true,
        },
      });

      return success(config, 201);
    } catch (err: any) {
      console.error("[UPI Config Error]", err?.message, err?.code, err);
      return error(`Failed to save UPI config: ${err?.message || "unknown"}`, 500);
    }
  });
}

// DELETE - Remove a UPI config
export async function DELETE(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform");

    if (!platform || !["PAYTM", "GOOGLE_PAY", "PHONE_PE"].includes(platform)) {
      return error("Valid platform is required (PAYTM, GOOGLE_PAY, PHONE_PE)");
    }

    const config = await prisma.upiConfig.findUnique({
      where: {
        tenantId_platform: {
          tenantId: ctx.tenantId,
          platform: platform as any,
        },
      },
    });

    if (!config) return error("UPI config not found", 404);

    await prisma.upiConfig.delete({ where: { id: config.id } });

    return success({ message: "UPI config removed" });
  }, [Role.VENDOR, Role.MANAGER, Role.BRAND_OWNER]);
}
