"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, CheckCircle2 } from "lucide-react";

type Entry = {
  id: string;
  tenantId: string;
  tenantName: string;
  currency: string;
  orderNumber: number;
  orderTotalCents: number;
  amountCents: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
  paidRef: string | null;
  createdAt: string;
};

function formatCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export default function BrandCommissionPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "PAID">("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "ALL" ? "/api/brand/commission" : `/api/brand/commission?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) setEntries(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  async function markPaid(id: string) {
    const ref = prompt("Optional payment reference (UPI ID, transaction note, etc.):");
    const res = await fetch(`/api/brand/commission/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paidRef: ref || null }),
    });
    if (res.ok) await load();
  }

  async function markPending(id: string) {
    if (!confirm("Mark this entry back to PENDING?")) return;
    const res = await fetch(`/api/brand/commission/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PENDING" }),
    });
    if (res.ok) await load();
  }

  const totalPending = entries.filter((e) => e.status === "PENDING").reduce((s, e) => s + e.amountCents, 0);
  const totalPaid = entries.filter((e) => e.status === "PAID").reduce((s, e) => s + e.amountCents, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-6 w-6 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commission Ledger</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Each row is the commission you&apos;re owed on one paid order. Mark as paid once the franchisee settles.</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 max-w-xl">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-400">{formatCurrency(totalPending)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paid (in this view)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-green-400">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["ALL", "PENDING", "PAID"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              filter === f
                ? "bg-orange-500 text-white border-orange-500"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">When</th>
              <th className="text-left px-5 py-3 font-semibold">Outlet</th>
              <th className="text-left px-5 py-3 font-semibold">Order #</th>
              <th className="text-right px-5 py-3 font-semibold">Order total</th>
              <th className="text-right px-5 py-3 font-semibold">Commission</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No commission entries yet.</td></tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-t border-border/50">
                  <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3 font-medium">{e.tenantName}</td>
                  <td className="px-5 py-3 text-muted-foreground">#{e.orderNumber}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(e.orderTotalCents, e.currency)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-amber-400">{formatCurrency(e.amountCents, e.currency)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      e.status === "PAID" ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {e.status}
                    </span>
                    {e.paidRef && <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{e.paidRef}</div>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {e.status === "PENDING" ? (
                      <button onClick={() => markPaid(e.id)} className="text-green-400 hover:text-green-300 inline-flex items-center gap-1 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                      </button>
                    ) : (
                      <button onClick={() => markPending(e.id)} className="text-muted-foreground hover:text-foreground text-xs">
                        Revert
                      </button>
                    )}
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
