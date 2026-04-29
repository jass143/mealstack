"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

type Tenant = {
  id: string;
  name: string;
  domain: string;
  email: string | null;
  phone: string | null;
  currency: string;
  createdAt: string;
  userCount: number;
  orderCount: number;
  totalRevenueCents: number;
  subscriptionStatus: string | null;
};

function formatCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/tenants");
        if (res.ok) setTenants(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8 text-slate-500">Loading tenants...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-orange-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-sm text-slate-400 mt-0.5">All restaurants registered on the platform.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Restaurant</th>
              <th className="text-left px-5 py-3 font-semibold">Domain</th>
              <th className="text-left px-5 py-3 font-semibold">Contact</th>
              <th className="text-right px-5 py-3 font-semibold">Users</th>
              <th className="text-right px-5 py-3 font-semibold">Orders</th>
              <th className="text-right px-5 py-3 font-semibold">Revenue</th>
              <th className="text-left px-5 py-3 font-semibold">Plan</th>
              <th className="text-left px-5 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-slate-500">No tenants yet.</td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id} className="border-t border-slate-800/50 hover:bg-slate-900/40">
                  <td className="px-5 py-3 font-medium">{t.name}</td>
                  <td className="px-5 py-3 text-slate-400 font-mono text-xs">{t.domain}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    {t.email || "--"}
                    {t.phone && <div className="text-slate-500">{t.phone}</div>}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{t.userCount}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{t.orderCount}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-green-400">
                    {formatCurrency(t.totalRevenueCents, t.currency)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      t.subscriptionStatus === "ACTIVE" ? "bg-green-500/10 text-green-400" :
                      t.subscriptionStatus === "TRIAL" ? "bg-amber-500/10 text-amber-400" :
                      t.subscriptionStatus === "CANCELED" ? "bg-red-500/10 text-red-400" :
                      "bg-slate-700/40 text-slate-400"
                    }`}>
                      {t.subscriptionStatus || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
