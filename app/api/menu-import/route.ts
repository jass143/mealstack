import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAuth, success, error, ApiContext } from "@/lib/api-helpers";
import { parseMenuImage, ParsedMenuItem } from "@/lib/gemini";

export type MenuDiffItem = ParsedMenuItem & {
  status: "new" | "updated" | "unchanged";
  existingProductId?: string;
  existingPriceCents?: number;
};

export type MenuImportResponse = {
  items: MenuDiffItem[];
  summary: {
    total: number;
    new: number;
    updated: number;
    unchanged: number;
  };
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const formData = await req.formData();
    const file = formData.get("menuImage") as File | null;

    if (!file) {
      return error("No image file provided");
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return error(
        `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return error("File size must be under 10MB");
    }

    // Get tenant currency for price parsing
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { currency: true },
    });

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Parse menu image with Gemini
    let parsedItems: ParsedMenuItem[];
    try {
      parsedItems = await parseMenuImage(
        base64,
        file.type,
        tenant?.currency || "USD"
      );
    } catch (err) {
      console.error("[Menu Import] Gemini parse error:", err);
      return error(
        "Failed to parse menu image. Please try a clearer photo.",
        422
      );
    }

    if (!parsedItems.length) {
      return error("No menu items found in the image. Please try a clearer photo.", 422);
    }

    // Fetch existing products for this tenant
    const existingProducts = await prisma.product.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: { id: true, name: true, priceCents: true },
    });

    // Build a lookup map (lowercase name -> product)
    const productMap = new Map(
      existingProducts.map((p) => [p.name.toLowerCase().trim(), p])
    );

    // Diff: classify each parsed item
    const diffItems: MenuDiffItem[] = parsedItems.map((item) => {
      const existing = productMap.get(item.name.toLowerCase().trim());

      if (!existing) {
        return { ...item, status: "new" as const };
      }

      if (existing.priceCents !== item.priceCents && item.priceCents > 0) {
        return {
          ...item,
          status: "updated" as const,
          existingProductId: existing.id,
          existingPriceCents: existing.priceCents,
        };
      }

      return {
        ...item,
        status: "unchanged" as const,
        existingProductId: existing.id,
        existingPriceCents: existing.priceCents,
      };
    });

    const response: MenuImportResponse = {
      items: diffItems,
      summary: {
        total: diffItems.length,
        new: diffItems.filter((i) => i.status === "new").length,
        updated: diffItems.filter((i) => i.status === "updated").length,
        unchanged: diffItems.filter((i) => i.status === "unchanged").length,
      },
    };

    return success(response);
  }, [Role.VENDOR, Role.MANAGER, Role.BRAND_OWNER]);
}
