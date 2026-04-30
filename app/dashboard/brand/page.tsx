"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ShoppingBag, DollarSign, ArrowRight } from "lucide-react";

type Overview = {
  brand: { name: string; createdAt: string };
  outletCount: number;
  totals: {
    orders: number;
    revenueCents: number;
  };
  outlets: {
    id: string;
    name: string;
    currency: string;
    orderCount: number;
    paidRevenueCents: number;
  }[];
};

function formatCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export default function BrandOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/brand/overview");
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Loading brand overview...</div>;
  if (!data) return <div className="p-8 text-red-400">Could not load brand data.</div>;

  const cards = [
    { label: "Outlets", value: data.outletCount.toString(), icon: Building2, color: "text-orange-400" },
    { label: "Total orders", value: data.totals.orders.toLocaleString(), icon: ShoppingBag, color: "text-blue-400" },
    { label: "Total paid revenue", value: formatCurrency(data.totals.revenueCents), icon: DollarSign, color: "text-green-400" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brand: {data.brand.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Read-only oversight across every outlet in your brand.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-3 max-w-3xl">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Per-outlet breakdown</h2>
          <Link href="/dashboard/brand/outlets" className="text-xs text-orange-400 inline-flex items-center gap-1">
            View all outlets <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Outlet</th>
              <th className="text-right px-5 py-3 font-semibold">Orders</th>
              <th className="text-right px-5 py-3 font-semibold">Paid revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.outlets.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">No outlets linked to this brand yet.</td>
              </tr>
            ) : (
              data.outlets.map((o) => (
                <tr key={o.id} className="border-t border-border/50">
                  <td className="px-5 py-3 font-medium">{o.name}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{o.orderCount}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-green-400">{formatCurrency(o.paidRevenueCents, o.currency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
