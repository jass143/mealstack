"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";

type Payment = {
  id: string;
  source: "ORDER" | "UPI";
  tenantName: string;
  tenantDomain: string;
  method: string;
  amountCents: number;
  currency: string;
  status: string;
  reference: string | null;
  createdAt: string;
};

function formatCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/payments");
        if (res.ok) setPayments(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8 text-slate-500">Loading payments...</div>;

  const totalCents = payments.reduce((s, p) => s + p.amountCents, 0);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-orange-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-sm text-slate-400 mt-0.5">All paid orders and UPI receipts across tenants.</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-3 max-w-2xl">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Records</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{payments.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Aggregate Volume</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-green-400">{formatCurrency(totalCents)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">When</th>
              <th className="text-left px-5 py-3 font-semibold">Source</th>
              <th className="text-left px-5 py-3 font-semibold">Tenant</th>
              <th className="text-left px-5 py-3 font-semibold">Method</th>
              <th className="text-right px-5 py-3 font-semibold">Amount</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="text-left px-5 py-3 font-semibold">Reference</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-500">No payments yet.</td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={`${p.source}-${p.id}`} className="border-t border-slate-800/50">
                  <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      p.source === "UPI" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                    }`}>
                      {p.source}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{p.tenantName}</div>
                    <div className="text-xs text-slate-500 font-mono">{p.tenantDomain}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-400">{p.method}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-green-400">
                    {formatCurrency(p.amountCents, p.currency)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      p.status === "PAID" || p.status === "SUCCESS" ? "bg-green-500/10 text-green-400" :
                      p.status === "PENDING" ? "bg-amber-500/10 text-amber-400" :
                      p.status === "FAILED" ? "bg-red-500/10 text-red-400" :
                      "bg-slate-700/40 text-slate-400"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 font-mono truncate max-w-[200px]">
                    {p.reference || "--"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
