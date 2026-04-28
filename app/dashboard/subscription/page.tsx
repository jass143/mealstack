"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatCents, formatDate } from "@/lib/utils";

type SubscriptionData = {
  id: string;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubId: string | null;
  planDetails: {
    name: string;
    price: number;
    features: readonly string[];
  } | null;
};

const PLAN_CARDS = [
  {
    key: "starter",
    name: "Starter",
    price: 2900,
    features: ["1 Location", "3 Staff", "POS + KDS", "Basic Reports"],
  },
  {
    key: "professional",
    name: "Professional",
    price: 7900,
    features: [
      "3 Locations",
      "15 Staff",
      "All Modules",
      "Advanced Reports",
      "CRM",
    ],
    popular: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: 19900,
    features: [
      "Unlimited Locations",
      "Unlimited Staff",
      "All Modules",
      "Priority Support",
      "Custom Integrations",
    ],
  },
];

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  TRIAL: "secondary",
  PAST_DUE: "destructive",
  CANCELED: "destructive",
};

export default function SubscriptionPage() {
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setSub(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (plan: string) => {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/subscription/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setPortalLoading(false);
    }
  };

  const isOnTrial = sub?.status === "TRIAL";
  const trialDaysLeft =
    isOnTrial && sub?.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(sub.trialEndsAt).getTime() - Date.now()) / 86400000
          )
        )
      : 0;

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground">
          Manage your plan and billing settings.
        </p>
      </div>

      {/* Trial Banner */}
      {isOnTrial && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">
            You are on a free trial.{" "}
            {trialDaysLeft > 0
              ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} remaining.`
              : "Your trial has expired."}{" "}
            Subscribe to a plan to continue using all features.
          </p>
        </div>
      )}

      {/* Current Plan Card */}
      {sub && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <CardDescription>
                  {sub.planDetails?.name ?? sub.plan}
                </CardDescription>
              </div>
              <Badge variant={STATUS_BADGE[sub.status] ?? "outline"}>
                {sub.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sub.planDetails && (
              <>
                <p className="text-2xl font-bold">
                  {formatCents(sub.planDetails.price)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </p>
                <ul className="space-y-1">
                  {sub.planDetails.features.map((f) => (
                    <li key={f} className="text-sm text-muted-foreground">
                      - {f}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {sub.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                Current period ends: {formatDate(sub.currentPeriodEnd)}
              </p>
            )}
            {sub.trialEndsAt && isOnTrial && (
              <p className="text-sm text-muted-foreground">
                Trial ends: {formatDate(sub.trialEndsAt)}
              </p>
            )}
          </CardContent>
          {sub.stripeCustomerId && (
            <CardFooter>
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={portalLoading}
              >
                {portalLoading ? "Opening..." : "Manage Billing"}
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      <Separator />

      {/* Pricing Grid */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {PLAN_CARDS.map((plan) => {
            const isCurrent = sub?.plan === plan.key && sub?.status === "ACTIVE";
            const isUpgrade =
              sub?.status === "ACTIVE" &&
              plan.price > (sub?.planDetails?.price ?? 0);
            const isDowngrade =
              sub?.status === "ACTIVE" &&
              plan.price < (sub?.planDetails?.price ?? 0);

            let buttonLabel = "Subscribe";
            if (isCurrent) buttonLabel = "Current Plan";
            else if (isUpgrade) buttonLabel = "Upgrade";
            else if (isDowngrade) buttonLabel = "Downgrade";

            return (
              <Card
                key={plan.key}
                className={`relative ${
                  plan.popular ? "border-primary shadow-md" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {formatCents(plan.price)}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">&#10003;</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || checkoutLoading === plan.key}
                    onClick={() => handleSubscribe(plan.key)}
                  >
                    {checkoutLoading === plan.key ? "Redirecting..." : buttonLabel}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
