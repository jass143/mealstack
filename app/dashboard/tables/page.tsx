"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCents, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  Armchair,
  Plus,
  Users,
  Clock,
  ShoppingCart,
  Loader2,
  X,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";

type ActiveOrder = {
  id: string;
  orderNumber: number;
  status: string;
  totalCents: number;
  createdAt: string;
  _count: { items: number };
};

type Table = {
  id: string;
  number: number;
  capacity: number;
  isActive: boolean;
  orders: ActiveOrder[];
};

const STATUS_COLORS: Record<string, { bg: string; ring: string; text: string; label: string }> = {
  PENDING: { bg: "bg-amber-500/15", ring: "ring-amber-500/30", text: "text-amber-400", label: "Pending" },
  CONFIRMED: { bg: "bg-sky-500/15", ring: "ring-sky-500/30", text: "text-sky-400", label: "Confirmed" },
  PREPARING: { bg: "bg-orange-500/15", ring: "ring-orange-500/30", text: "text-orange-400", label: "Preparing" },
  READY: { bg: "bg-emerald-500/15", ring: "ring-emerald-500/30", text: "text-emerald-400", label: "Ready" },
  SERVED: { bg: "bg-violet-500/15", ring: "ring-violet-500/30", text: "text-violet-400", label: "Served" },
};

function getElapsedMins(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("4");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch("/api/tables");
      if (res.ok) {
        const data = await res.json();
        setTables(Array.isArray(data) ? data : data.data || []);
      }
    } catch {
      toast({ title: "Error loading tables", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTables();
    // Auto-refresh every 30s
    const interval = setInterval(fetchTables, 30000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  const handleAddTable = async () => {
    const num = parseInt(newTableNumber);
    const cap = parseInt(newTableCapacity);
    if (isNaN(num) || num <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num, capacity: cap || 4 }),
      });
      if (res.ok) {
        toast({ title: `Table ${num} added` });
        setAddDialogOpen(false);
        setNewTableNumber("");
        setNewTableCapacity("4");
        fetchTables();
      } else {
        const data = await res.json();
        toast({ title: data.error || "Failed to add table", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to add table", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const occupiedCount = tables.filter((t) => t.orders.length > 0).length;
  const freeCount = tables.length - occupiedCount;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Table Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tables.length} tables &middot; {occupiedCount} occupied &middot; {freeCount} free
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Table
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-extrabold">{tables.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Tables</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-2xl font-extrabold text-emerald-500">{freeCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Available</p>
        </div>
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
          <p className="text-2xl font-extrabold text-orange-500">{occupiedCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Occupied</p>
        </div>
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {tables.map((table) => {
          const activeOrder = table.orders[0] || null;
          const isOccupied = !!activeOrder;
          const status = activeOrder ? STATUS_COLORS[activeOrder.status] || STATUS_COLORS.PENDING : null;

          return (
            <div
              key={table.id}
              className={cn(
                "relative flex flex-col items-center rounded-2xl border p-4 transition-all",
                isOccupied
                  ? `${status!.bg} ${status!.ring} ring-1 border-transparent`
                  : "border-border bg-card hover:border-emerald-500/30"
              )}
            >
              {/* Table icon */}
              <Armchair className={cn(
                "h-8 w-8 mb-1",
                isOccupied ? status!.text : "text-muted-foreground"
              )} />

              {/* Table number */}
              <span className="text-xl font-black">{table.number}</span>

              {/* Capacity */}
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground mt-0.5">
                <Users className="h-3 w-3" />
                {table.capacity}
              </span>

              {/* Order info if occupied */}
              {activeOrder && (
                <div className="mt-2 w-full space-y-1">
                  <div className={cn("rounded-md px-2 py-0.5 text-center text-[10px] font-bold", status!.bg, status!.text)}>
                    {status!.label}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">
                      #{activeOrder.orderNumber} &middot; {activeOrder._count.items} items
                    </p>
                    <p className="text-xs font-bold mt-0.5">{formatCents(activeOrder.totalCents)}</p>
                    <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {getElapsedMins(activeOrder.createdAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* Free label */}
              {!isOccupied && (
                <Link
                  href="/dashboard/pos"
                  className="mt-2 rounded-md bg-emerald-500/15 px-3 py-1 text-[10px] font-bold text-emerald-500 hover:bg-emerald-500/25 transition-colors"
                >
                  Free &middot; Seat
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Table Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
            <DialogDescription>Add a new table to your restaurant floor plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tableNumber">Table Number</Label>
              <Input
                id="tableNumber"
                type="number"
                min="1"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                placeholder="e.g. 13"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tableCapacity">Seating Capacity</Label>
              <Input
                id="tableCapacity"
                type="number"
                min="1"
                value={newTableCapacity}
                onChange={(e) => setNewTableCapacity(e.target.value)}
                placeholder="e.g. 4"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTable} disabled={submitting || !newTableNumber}>
              {submitting ? "Adding..." : "Add Table"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
