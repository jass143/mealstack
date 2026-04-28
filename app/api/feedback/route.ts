import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error, ApiContext } from "@/lib/api-helpers";
import { z } from "zod";

const feedbackSchema = z.object({
  customerName: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional().default(""),
  source: z.string().optional().default("IN_STORE"),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const feedbacks = await prisma.notification.findMany({
      where: {
        tenantId: ctx.tenantId,
        title: { startsWith: "Feedback:" },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Parse feedback data from notification message
    const parsed = feedbacks.map((n) => {
      try {
        const data = JSON.parse(n.message);
        return { id: n.id, ...data, createdAt: n.createdAt };
      } catch {
        return {
          id: n.id,
          customerName: "Unknown",
          rating: 0,
          comment: n.message,
          source: "UNKNOWN",
          createdAt: n.createdAt,
        };
      }
    });

    return success(parsed);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (ctx: ApiContext) => {
    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return error(parsed.error.errors.map((e) => e.message).join(", "));
    }

    const data = parsed.data;

    // Store feedback as a notification (reusing existing model)
    await prisma.notification.create({
      data: {
        tenantId: ctx.tenantId,
        title: `Feedback: ${data.customerName}`,
        message: JSON.stringify({
          customerName: data.customerName,
          rating: data.rating,
          comment: data.comment,
          source: data.source,
        }),
      },
    });

    return success({ message: "Feedback saved" }, 201);
  });
}
