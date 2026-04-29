import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAuth, success, error, ApiContext } from "@/lib/api-helpers";
import { z } from "zod";

const confirmItemSchema = z.object({
  name: z.string().min(1),
  priceCents: z.number().int().min(0),
  category: z.string().min(1),
  description: z.string().optional().default(""),
  isVeg: z.boolean().optional().default(false),
  isMeal: z.boolean().optional().default(false),
  status: z.enum(["new", "updated"]),
  existingProductId: z.string().optional(),
});

const confirmSchema = z.object({
  items: z.array(confirmItemSchema).min(1),
});

export async function POST(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const body = await req.json();
    const parsed = confirmSchema.safeParse(body);

    if (!parsed.success) {
      const messages = parsed.error.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`
      );
      return error(messages.join(", "));
    }

    const { items } = parsed.data;

    // Resolve categories: find existing or create new ones
    const uniqueCategories = [...new Set(items.map((i) => i.category))];
    const categoryMap = new Map<string, string>();

    for (const catName of uniqueCategories) {
      let category = await prisma.category.findFirst({
        where: {
          tenantId: ctx.tenantId,
          name: { equals: catName },
        },
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            tenantId: ctx.tenantId,
            name: catName,
          },
        });
      }

      categoryMap.set(catName, category.id);
    }

    let added = 0;
    let updated = 0;

    for (const item of items) {
      const categoryId = categoryMap.get(item.category)!;

      if (item.status === "new") {
        // Create new product
        await prisma.product.create({
          data: {
            tenantId: ctx.tenantId,
            name: item.name,
            description: item.description || undefined,
            priceCents: item.priceCents,
            categoryId,
            isVeg: item.isVeg,
          },
        });
        added++;

        // If it's a meal, also create the meal variant link
        if (item.isMeal) {
          // Find the base product we just created
          const baseProduct = await prisma.product.findFirst({
            where: {
              tenantId: ctx.tenantId,
              name: item.name,
              isActive: true,
            },
            orderBy: { createdAt: "desc" },
          });

          if (baseProduct) {
            // Create a meal variant product
            const mealProduct = await prisma.product.create({
              data: {
                tenantId: ctx.tenantId,
                name: `${item.name} (Meal)`,
                priceCents: item.priceCents,
                categoryId,
                isVeg: item.isVeg,
                isActive: false, // hidden, shown via POS meal popup
              },
            });

            await prisma.product.update({
              where: { id: baseProduct.id },
              data: { mealProductId: mealProduct.id },
            });
          }
        }
      } else if (item.status === "updated" && item.existingProductId) {
        // Verify product belongs to this tenant
        const existing = await prisma.product.findFirst({
          where: { id: item.existingProductId, tenantId: ctx.tenantId },
        });

        if (existing) {
          await prisma.product.update({
            where: { id: item.existingProductId },
            data: {
              priceCents: item.priceCents,
              categoryId,
              description: item.description || existing.description,
              isVeg: item.isVeg,
            },
          });
          updated++;
        }
      }
    }

    return success({
      message: `Menu imported successfully`,
      added,
      updated,
    });
  }, [Role.VENDOR, Role.MANAGER]);
}
