import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        const plan = session.metadata?.plan;
        const stripeSubId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!tenantId || !plan) {
          console.error("Missing metadata on checkout session:", session.id);
          break;
        }

        // Retrieve subscription details from Stripe
        let currentPeriodEnd: Date | null = null;
        if (stripeSubId) {
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
          currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
        }

        await prisma.subscription.update({
          where: { tenantId },
          data: {
            plan,
            status: "ACTIVE",
            stripeSubId: stripeSubId ?? null,
            stripeCustomerId:
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id ?? undefined,
            currentPeriodEnd,
            trialEndsAt: null,
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const stripeSubId = sub.id;

        const existing = await prisma.subscription.findFirst({
          where: { stripeSubId },
        });

        if (!existing) {
          console.error("No subscription found for stripeSubId:", stripeSubId);
          break;
        }

        const statusMap: Record<string, string> = {
          active: "ACTIVE",
          past_due: "PAST_DUE",
          canceled: "CANCELED",
          trialing: "TRIAL",
        };

        await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            status: (statusMap[sub.status] ?? "ACTIVE") as "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIAL",
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const stripeSubId = sub.id;

        const existing = await prisma.subscription.findFirst({
          where: { stripeSubId },
        });

        if (!existing) {
          console.error("No subscription found for stripeSubId:", stripeSubId);
          break;
        }

        await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            status: "CANCELED",
            stripeSubId: null,
          },
        });
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
