import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { PLANS } from "@/lib/stripe";

export async function GET(_req: NextRequest) {
  return withAuth(async (ctx) => {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: ctx.tenantId },
    });

    if (!subscription) {
      return error("No subscription found", 404);
    }

    const planDetails =
      subscription.plan in PLANS
        ? PLANS[subscription.plan as keyof typeof PLANS]
        : null;

    return success({
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubId: subscription.stripeSubId,
      planDetails,
    });
  }, [Role.VENDOR, Role.BRAND_OWNER]);
}
