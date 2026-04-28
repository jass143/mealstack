import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
  typescript: true,
});

export const PLANS = {
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_STARTER || "",
    price: 2900, // $29/mo
    features: ["1 Location", "3 Staff", "POS + KDS", "Basic Reports"],
  },
  professional: {
    name: "Professional",
    priceId: process.env.STRIPE_PRICE_PROFESSIONAL || "",
    price: 7900, // $79/mo
    features: ["3 Locations", "15 Staff", "All Modules", "Advanced Reports", "CRM"],
  },
  enterprise: {
    name: "Enterprise",
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || "",
    price: 19900, // $199/mo
    features: ["Unlimited Locations", "Unlimited Staff", "All Modules", "Priority Support", "Custom Integrations"],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
