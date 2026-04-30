"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type Brand = {
  id: string;
  name: string;
  commissionPercent: number;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  outlets: { id: string; name: string; domain: string; createdAt: string; _count: { orders: number } }[];
};

export default function AdminBrandDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const brandId = params.id;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkTenantId, setLinkTenantId] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [editName, setEditName] = useState("");
  const [editPct, setEditPct] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/brands/${brandId}`);
      if (res.ok) {
        const data = await res.json();
        setBrand(data);
        setEditName(data.name);
        setEditPct(data.commissionPercent);
      }
    } finally {
      setLoading(false);
    }
  }, [brandId]);
  useEffect(() => { load(); }, [load]);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    setLinking(true);
    setLinkError("");
    try {
      const res = await fetch(`/api/admin/brands/${brandId}/outlets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: linkTenantId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkError(data.error || "Failed to link outlet");
        return;
      }
      setLinkTenantId("");
      await load();
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(tenantId: string) {
    if (!confirm("Unlink this outlet from the brand? It will become an independent restaurant. Past commission entries are kept.")) return;
    const res = await fetch(`/api/admin/brands/${brandId}/outlets?tenantId=${tenantId}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/brands/${brandId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, commissionPercent: editPct }),
      });
      if (res.ok) await load();
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this brand? Outlets will become independent and the owner is demoted to VENDOR. Past commission entries are removed.")) return;
    const res = await fetch(`/api/admin/brands/${brandId}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/brands");
  }

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;
  if (!brand) return <div className="p-8 text-red-400">Brand not found</div>;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <Link href="/admin/brands" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to brands
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{brand.name}</h1>
        <p className="text-sm text-slate-400 mt-1">Owner: {brand.owner.name} &lt;{brand.owner.email}&gt;</p>
      </div>

      <form onSubmit={handleSaveEdit} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Brand name</label>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Commission %</label>
          <input
            type="number"
            step={0.1}
            min={0}
            max={100}
            value={editPct}
            onChange={(e) => setEditPct(parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={savingEdit} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {savingEdit ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={handleDelete} className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
            Delete brand
          </button>
        </div>
      </form>

      <div>
        <h2 className="font-semibold mb-3">Outlets ({brand.outlets.length})</h2>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Outlet</th>
                <th className="text-left px-5 py-3 font-semibold">Domain</th>
                <th className="text-right px-5 py-3 font-semibold">Orders</th>
                <th className="text-left px-5 py-3 font-semibold">Joined brand</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {brand.outlets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">No outlets linked yet.</td>
                </tr>
              ) : (
                brand.outlets.map((o) => (
                  <tr key={o.id} className="border-t border-slate-800/50">
                    <td className="px-5 py-3 font-medium">{o.name}</td>
                    <td className="px-5 py-3 text-slate-400 font-mono text-xs">{o.domain}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{o._count.orders}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleUnlink(o.id)} className="text-red-400 hover:text-red-300 inline-flex items-center gap-1 text-xs">
                        <Trash2 className="h-3.5 w-3.5" /> Unlink
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={handleLink} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Link an existing outlet</h3>
        {linkError && <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">{linkError}</div>}
        <p className="text-xs text-slate-400">
          Paste the tenant ID of the franchisee&apos;s restaurant. They must register at <code className="text-slate-300">/register</code> first; copy their tenant ID from <Link href="/admin/tenants" className="text-orange-400">Tenants</Link>.
        </p>
        <div className="flex gap-2">
          <input
            value={linkTenantId}
            onChange={(e) => setLinkTenantId(e.target.value)}
            placeholder="cm... (tenant ID)"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-orange-500 font-mono"
          />
          <button type="submit" disabled={linking || !linkTenantId.trim()} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {linking ? "Linking..." : "Link outlet"}
          </button>
        </div>
      </form>
    </div>
  );
}
