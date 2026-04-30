"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

type Outlet = {
  id: string;
  name: string;
  domain: string;
  currency: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  orderCount: number;
  userCount: number;
  paidRevenueCents: number;
  vendor: { id: string; name: string; email: string; lastLoginAt: string | null } | null;
};

function formatCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export default function BrandOutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/brand/outlets");
        if (res.ok) setOutlets(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Loading outlets...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-orange-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outlets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All restaurants in your brand. Read-only — each outlet&apos;s vendor manages their own day-to-day.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Outlet</th>
              <th className="text-left px-5 py-3 font-semibold">Vendor</th>
              <th className="text-left px-5 py-3 font-semibold">Contact</th>
              <th className="text-right px-5 py-3 font-semibold">Users</th>
              <th className="text-right px-5 py-3 font-semibold">Orders</th>
              <th className="text-right px-5 py-3 font-semibold">Paid revenue</th>
              <th className="text-left px-5 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody>
            {outlets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No outlets linked to your brand yet. Contact platform admin to link outlets.</td>
              </tr>
            ) : (
              outlets.map((o) => (
                <tr key={o.id} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-5 py-3">
                    <div className="font-medium">{o.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{o.domain}</div>
                  </td>
                  <td className="px-5 py-3">
                    {o.vendor ? (
                      <>
                        <div className="font-medium">{o.vendor.name}</div>
                        <div className="text-xs text-muted-foreground">{o.vendor.email}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">No vendor</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">
                    {o.email && <div>{o.email}</div>}
                    {o.phone && <div>{o.phone}</div>}
                    {o.address && <div className="truncate max-w-[200px]">{o.address}</div>}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{o.userCount}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{o.orderCount}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-green-400">{formatCurrency(o.paidRevenueCents, o.currency)}</td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
