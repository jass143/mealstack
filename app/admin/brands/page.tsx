"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";

type Brand = {
  id: string;
  name: string;
  createdAt: string;
  outletCount: number;
  owner: { id: string; name: string; email: string };
};

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  // Create form state
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/admin/brands");
      if (res.ok) setBrands(await res.json());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ownerEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create brand");
        return;
      }
      setName("");
      setOwnerEmail("");
      setShowCreate(false);
      await load();
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="p-8 text-slate-500">Loading brands...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-orange-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Brands</h1>
            <p className="text-sm text-slate-400 mt-0.5">Group multiple outlets under one owner. The brand owner gets read-only oversight across every outlet.</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/20"
        >
          <Plus className="h-4 w-4" />
          New brand
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4 max-w-xl">
          <h2 className="font-semibold">Create brand</h2>
          {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">{error}</div>}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Brand name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pizza Palace"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Owner email (must be a registered user)</label>
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="vendor@demo.com"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <p className="mt-1 text-xs text-slate-500">The user will be promoted to BRAND_OWNER. Their existing tenant becomes the brand&apos;s first outlet.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={creating} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {creating ? "Creating..." : "Create brand"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Brand</th>
              <th className="text-left px-5 py-3 font-semibold">Owner</th>
              <th className="text-right px-5 py-3 font-semibold">Outlets</th>
              <th className="text-left px-5 py-3 font-semibold">Created</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {brands.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">No brands yet. Create one to give a vendor read-only oversight across multiple outlets.</td>
              </tr>
            ) : (
              brands.map((b) => (
                <tr key={b.id} className="border-t border-slate-800/50 hover:bg-slate-900/40">
                  <td className="px-5 py-3 font-medium">{b.name}</td>
                  <td className="px-5 py-3">
                    <div>{b.owner.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{b.owner.email}</div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{b.outletCount}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/admin/brands/${b.id}`} className="text-orange-400 text-xs font-semibold">Manage →</Link>
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
