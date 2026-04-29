"use client";

import { useEffect, useState } from "react";
import { Building2, Users, ShoppingBag, DollarSign, TrendingUp } from "lucide-react";

type Stats = {
  totalTenants: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenueCents: number;
  totalUpiPaymentsCents: number;
  recentTenants: { id: string; name: string; domain: string; createdAt: string }[];
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) {
          setErr("Failed to load stats");
          setLoading(false);
          return;
        }
        setStats(await res.json());
      } catch {
        setErr("Failed to load stats");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="p-8 text-slate-500">Loading platform stats...</div>;
  }
  if (err || !stats) {
    return <div className="p-8 text-red-400">{err || "No data"}</div>;
  }

  const cards = [
    { label: "Tenants", value: stats.totalTenants.toLocaleString(), icon: Building2, color: "text-orange-400" },
    { label: "Users", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-purple-400" },
    { label: "Orders", value: stats.totalOrders.toLocaleString(), icon: ShoppingBag, color: "text-blue-400" },
    { label: "Order Revenue", value: formatCurrency(stats.totalRevenueCents), icon: DollarSign, color: "text-green-400" },
    { label: "UPI Payments", value: formatCurrency(stats.totalUpiPaymentsCents), icon: TrendingUp, color: "text-amber-400" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-sm text-slate-400 mt-1">Aggregate metrics across all tenants on MealStack.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.label}</p>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold">Recently registered tenants</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Name</th>
              <th className="text-left px-5 py-3 font-semibold">Domain</th>
              <th className="text-left px-5 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentTenants.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-slate-500">No tenants yet.</td>
              </tr>
            ) : (
              stats.recentTenants.map((t) => (
                <tr key={t.id} className="border-t border-slate-800/50">
                  <td className="px-5 py-3 font-medium">{t.name}</td>
                  <td className="px-5 py-3 text-slate-400">{t.domain}</td>
                  <td className="px-5 py-3 text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
