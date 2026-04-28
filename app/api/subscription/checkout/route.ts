import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, success, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { stripe, PLANS, PlanKey } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  return withAuth(async (ctx) => {
    const body = await req.json();
    const { plan } = body as { plan: string };

    if (!plan || !(plan in PLANS)) {
      return error("Invalid plan. Must be starter, professional, or enterprise.");
    }

    const planConfig = PLANS[plan as PlanKey];

    // Get or create Stripe customer
    let subscription = await prisma.subscription.findUnique({
      where: { tenantId: ctx.tenantId },
    });

    if (!subscription) {
      return error("No subscription record found", 404);
    }

    let stripeCustomerId = subscription.stripeCustomerId;

    if (!stripeCustomerId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
      });

      const customer = await stripe.customers.create({
        email: tenant?.email ?? undefined,
        metadata: {
          tenantId: ctx.tenantId,
        },
      });

      stripeCustomerId = customer.id;

      await prisma.subscription.update({
        where: { tenantId: ctx.tenantId },
        data: { stripeCustomerId },
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/subscription?success=true`,
      cancel_url: `${baseUrl}/dashboard/subscription?canceled=true`,
      metadata: {
        tenantId: ctx.tenantId,
        plan,
      },
    });

    return success({ url: session.url });
  }, [Role.ADMIN]);
}
