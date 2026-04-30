import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { stripe } from "@/lib/stripe";

export async function POST(_req: NextRequest) {
  return withAuth(async (ctx) => {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: ctx.tenantId },
    });

    if (!subscription?.stripeCustomerId) {
      return error("No billing account found. Please subscribe to a plan first.", 400);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${baseUrl}/dashboard/subscription`,
    });

    return success({ url: session.url });
  }, [Role.VENDOR, Role.BRAND_OWNER]);
}
