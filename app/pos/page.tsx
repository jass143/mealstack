"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { usePosStore } from "@/stores/use-pos-store";
import type { OrderType, PaymentMethod } from "@/stores/use-pos-store";
import { formatCents, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import {
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  Loader2,
  Search,
  UtensilsCrossed,
  Truck,
  Coffee,
  X,
  Printer,
  CreditCard,
  Smartphone,
  Banknote,
  Percent,
  Users,
  Check,
  Armchair,
  ReceiptText,
  ArrowLeft,
  ClipboardList,
  Clock,
  Pause,
  Bell,
  LogOut,
  FileText,
  ChefHat,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";

// ─── Types ──────────────────────────────────────────────────────────────────
type Category = { id: string; name: string; sortOrder: number };
type Product = {
  id: string;
  name: string;
  priceCents: number;
  isVeg: boolean;
  image: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
};
type Table = { id: string; number: number; capacity: number };

const ORDER_TYPES: { value: OrderType; label: string; icon: typeof UtensilsCrossed; color: string }[] = [
  { value: "DINE_IN", label: "Dine In", icon: UtensilsCrossed, color: "bg-red-500 hover:bg-red-600 text-white" },
  { value: "DELIVERY", label: "Delivery", icon: Truck, color: "bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white" },
  { value: "TAKEAWAY", label: "Pick Up", icon: Coffee, color: "bg-amber-500 hover:bg-amber-600 text-white" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "UPI", label: "UPI", icon: Smartphone },
];

const GST_RATE = 5;

// ─── Main POS Component ─────────────────────────────────────────────────────
export default function FullScreenPOS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [lastOrder, setLastOrder] = useState<Record<string, unknown> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const {
    items, orderType, tableId, tableNumber, notes,
    discountPercent, paymentMethod,
    addItem, removeItem, updateQty, clearCart,
    setOrderType, setTableId, setNotes,
    setDiscountPercent, setPaymentMethod,
  } = usePosStore();

  const { toast } = useToast();

  // ── Computed ──
  const subtotalCents = useMemo(() => items.reduce((sum, i) => sum + i.priceCents * i.qty, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const discountCents = useMemo(() => Math.round(subtotalCents * (discountPercent / 100)), [subtotalCents, discountPercent]);
  const taxableAmount = subtotalCents - discountCents;
  const cgstCents = useMemo(() => Math.round(taxableAmount * (GST_RATE / 2 / 100)), [taxableAmount]);
  const sgstCents = cgstCents;
  const totalCents = taxableAmount + cgstCents + sgstCents;

  // ── Data fetch ──
  const fetchData = useCallback(async () => {
    try {
      const [pRes, cRes, tRes] = await Promise.all([
        fetch("/api/products"), fetch("/api/categories"), fetch("/api/tables"),
      ]);
      if (pRes.ok) { const d = await pRes.json(); setProducts(Array.isArray(d) ? d : d.data || []); }
      if (cRes.ok) { const d = await cRes.json(); setCategories(Array.isArray(d) ? d : d.data || []); }
      if (tRes.ok) { const d = await tRes.json(); setTables(Array.isArray(d) ? d : d.data || []); }
    } catch {
      toast({ title: "Error", description: "Failed to load POS data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); searchRef.current?.focus(); }
      }
      if (e.key === "Escape") {
        if (showTablePicker) setShowTablePicker(false);
        if (showBill) setShowBill(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showTablePicker, showBill]);

  // ── Filtered products ──
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCategory === "all" || p.categoryId === activeCategory;
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // ── Handlers ──
  const handleAddToCart = useCallback((product: Product) => {
    addItem({ productId: product.id, productName: product.name, priceCents: product.priceCents, qty: 1 });
  }, [addItem]);

  const handlePlaceOrder = async () => {
    if (items.length === 0) { toast({ title: "Cart is empty", variant: "destructive" }); return; }
    if (orderType === "DINE_IN" && !tableId) { setShowTablePicker(true); toast({ title: "Select a table for dine-in", variant: "destructive" }); return; }

    setPlacing(true);
    try {
      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          tableId: orderType === "DINE_IN" ? tableId : undefined,
          notes: notes || undefined,
          items: items.map((i) => ({ productId: i.productId, qty: i.qty, notes: i.notes })),
        }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed"); }
      const order = await res.json();

      const payRes = await fetch(`/api/pos/orders/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, paymentMethod, discountCents }),
      });

      if (payRes.ok) {
        const paidOrder = await payRes.json();
        setLastOrder({ ...paidOrder, paymentMethod });
      } else {
        setLastOrder({ ...order, paymentMethod });
      }

      setShowBill(true);
      toast({ title: `Order #${order.orderNumber} placed!`, description: `Paid via ${paymentMethod}` });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  };

  const handleNewOrder = () => { clearCart(); setShowBill(false); setLastOrder(null); };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="text-sm text-muted-foreground">Loading POS...</p>
        </div>
      </div>
    );
  }

  // ── Bill View ──
  if (showBill && lastOrder) {
    return <BillView order={lastOrder} onNewOrder={handleNewOrder} />;
  }

  // ─── FULL SCREEN POS LAYOUT ───
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ═══ TOP BAR ═══ */}
      <header className="flex h-12 shrink-0 items-center border-b border-border bg-card px-3 gap-3">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-2">
          <Image src="/images/logo-icon-orange.png" alt="M" width={28} height={28} className="h-7 w-7" />
        </Link>

        {/* New Order */}
        <button
          onClick={handleNewOrder}
          className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-600 transition-colors"
        >
          New Order
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            placeholder='Search item...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-8 text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Order type tabs */}
        <div className="flex gap-1 ml-2">
          {ORDER_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setOrderType(t.value);
                if (t.value === "DINE_IN" && !tableId) setShowTablePicker(true);
              }}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-bold transition-all",
                orderType === t.value ? t.color : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table badge */}
        {orderType === "DINE_IN" && (
          <button
            onClick={() => setShowTablePicker(true)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              tableNumber
                ? "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30"
                : "bg-red-500/15 text-red-500 ring-1 ring-red-500/30 animate-pulse"
            )}
          >
            {tableNumber ? `Table ${tableNumber}` : "Select Table"}
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right icons */}
        <div className="flex items-center gap-1">
          {[
            { icon: ClipboardList, label: "Orders", href: "/dashboard/pos/orders" },
            { icon: Clock, label: "Recent" },
            { icon: Pause, label: "Hold" },
            { icon: ChefHat, label: "KDS", href: "/dashboard/kds" },
            { icon: Bell, label: "Alerts" },
          ].map((item) => {
            const btn = (
              <button
                key={item.label}
                className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title={item.label}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            );
            if (item.href) return <Link key={item.label} href={item.href}>{btn}</Link>;
            return btn;
          })}

          <div className="h-6 w-px bg-border mx-1" />

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-[9px] font-medium">Logout</span>
          </button>

          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-1"
            title="Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[9px] font-medium">Back</span>
          </Link>
        </div>
      </header>

      {/* ═══ MAIN BODY ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── LEFT: Categories ─── */}
        <div className="flex w-[120px] shrink-0 flex-col border-r border-border bg-card overflow-y-auto scrollbar-thin">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-3 py-3 text-xs font-bold text-left border-l-[3px] transition-all",
              activeCategory === "all"
                ? "border-l-orange-500 bg-orange-500/10 text-orange-500"
                : "border-l-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-3 py-3 text-xs font-bold text-left border-l-[3px] transition-all",
                activeCategory === cat.id
                  ? "border-l-orange-500 bg-orange-500/10 text-orange-500"
                  : "border-l-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* ─── CENTER: Product Grid ─── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {filteredProducts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Search className="h-12 w-12 opacity-30" />
              <p className="text-sm">No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredProducts.map((product) => {
                const inCart = items.find((i) => i.productId === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    className={cn(
                      "relative flex flex-col rounded-lg border p-3 text-left transition-all active:scale-[0.97]",
                      inCart
                        ? "border-orange-500 bg-orange-500/5 shadow-sm"
                        : "border-border bg-card hover:border-orange-500/40 hover:shadow-sm"
                    )}
                  >
                    {/* Veg/Non-veg indicator */}
                    <div className={cn(
                      "absolute left-2 top-2 h-3 w-3 rounded-sm border-[1.5px] flex items-center justify-center",
                      product.isVeg ? "border-green-500" : "border-red-500"
                    )}>
                      <div className={cn("h-1.5 w-1.5 rounded-full", product.isVeg ? "bg-green-500" : "bg-red-500")} />
                    </div>

                    {/* Qty badge */}
                    {inCart && (
                      <div className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white shadow">
                        {inCart.qty}
                      </div>
                    )}

                    <p className="pl-4 text-xs font-semibold leading-snug line-clamp-2 mt-0.5">{product.name}</p>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">{product.category?.name}</span>
                    <span className="mt-auto pt-2 text-sm font-extrabold text-orange-500">{formatCents(product.priceCents)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── RIGHT: Cart Panel ─── */}
        <div className="flex w-[380px] shrink-0 flex-col border-l border-border bg-card">
          {/* Cart header with table icons */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <ShoppingCart className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Items</span>
            {itemCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}

            <div className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="w-16 text-center">Qty.</span>
              <span className="w-16 text-right">Price</span>
            </div>

            {items.length > 0 && (
              <button onClick={clearCart} className="ml-2 text-muted-foreground hover:text-red-500 transition-colors" title="Clear all">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">No Item Selected</p>
                <p className="text-xs text-muted-foreground/60">Select items from menu</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item, idx) => (
                  <div key={item.productId} className="group flex items-center gap-2 px-4 py-2 hover:bg-accent/30 transition-colors">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-muted-foreground">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{item.productName}</p>
                      <p className="text-[10px] text-muted-foreground">{formatCents(item.priceCents)} each</p>
                    </div>
                    {/* Qty stepper */}
                    <div className="flex items-center rounded-lg border border-border">
                      <button
                        onClick={() => updateQty(item.productId, item.qty - 1)}
                        className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-orange-500 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.productId, item.qty + 1)}
                        className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-orange-500 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="w-16 text-right text-xs font-bold">{formatCents(item.priceCents * item.qty)}</span>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── BOTTOM: Petpooja-style footer ─── */}
          <div className="border-t border-border mt-auto">
            {/* Row 1: Bogo Offer + Split + Discount + Total */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <button className="rounded-md bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-600 transition-colors">
                Bogo Offer
              </button>
              <button className="rounded-md bg-sky-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-sky-600 transition-colors">
                Split
              </button>
              {/* Discount pills */}
              <div className="flex items-center gap-1 ml-1">
                {[0, 5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setDiscountPercent(pct)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold transition-all",
                      discountPercent === pct
                        ? "bg-orange-500 text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-baseline gap-2">
                <span className="text-sm font-bold text-muted-foreground">Total</span>
                <span className="text-2xl font-black">{formatCents(totalCents)}</span>
              </div>
            </div>

            {/* Row 2: Payment methods — Cash / Card / Other / More */}
            <div className="flex items-center border-b border-border">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    "flex items-center gap-2 flex-1 justify-center px-3 py-2.5 text-xs font-semibold border-r border-border transition-all",
                    paymentMethod === m.value
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <m.icon className="h-4 w-4" />
                  {m.label}
                  {paymentMethod === m.value && (
                    <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="h-2 w-2 text-white" />
                    </span>
                  )}
                </button>
              ))}
              <button className="flex items-center gap-1 px-4 py-2.5 text-xs text-muted-foreground hover:bg-accent transition-colors">
                More
              </button>
            </div>

            {/* Row 3: It's Paid checkbox + notes */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-border accent-emerald-500" />
                <span className="text-xs font-semibold">It&apos;s Paid</span>
              </label>
              <input
                type="text"
                placeholder="Order notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-orange-500"
              />
            </div>

            {/* Row 4: Action buttons — matching Petpooja exactly */}
            <div className="flex gap-1.5 p-2.5">
              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="rounded-md bg-red-500 px-3 py-2.5 text-[11px] font-bold text-white hover:bg-red-600 active:scale-[0.97] transition-all disabled:opacity-50"
              >
                {placing ? "..." : "Save"}
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="rounded-md bg-red-500 px-3 py-2.5 text-[11px] font-bold text-white hover:bg-red-600 active:scale-[0.97] transition-all disabled:opacity-50"
              >
                Save & Print
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="rounded-md bg-red-500 px-3 py-2.5 text-[11px] font-bold text-white hover:bg-red-600 active:scale-[0.97] transition-all disabled:opacity-50"
              >
                Save & EBill
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="rounded-md bg-gray-700 px-3 py-2.5 text-[11px] font-bold text-white hover:bg-gray-600 active:scale-[0.97] transition-all disabled:opacity-50"
              >
                KOT
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="rounded-md bg-gray-700 px-3 py-2.5 text-[11px] font-bold text-white hover:bg-gray-600 active:scale-[0.97] transition-all disabled:opacity-50"
              >
                KOT & Print
              </button>
              <button
                onClick={() => toast({ title: "Order held" })}
                className="rounded-md bg-muted px-3 py-2.5 text-[11px] font-bold text-muted-foreground hover:bg-accent active:scale-[0.97] transition-all"
              >
                Hold
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TABLE PICKER OVERLAY ═══ */}
      {showTablePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowTablePicker(false)}>
          <div className="mx-4 w-full max-w-2xl rounded-2xl bg-card p-6 shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Select Table</h2>
              <button onClick={() => setShowTablePicker(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
              {tables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => { setTableId(table.id, table.number); setShowTablePicker(false); }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl p-4 transition-all active:scale-95",
                    tableId === table.id
                      ? "bg-orange-500 text-white ring-2 ring-orange-400 shadow-lg"
                      : "bg-muted text-muted-foreground ring-1 ring-border hover:ring-orange-500/50"
                  )}
                >
                  <Armchair className="h-6 w-6" />
                  <span className="text-lg font-black">{table.number}</span>
                  <span className="text-[10px] flex items-center gap-0.5 opacity-70">
                    <Users className="h-3 w-3" />{table.capacity}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bill View ──────────────────────────────────────────────────────────────
function BillView({ order, onNewOrder }: { order: Record<string, unknown>; onNewOrder: () => void }) {
  const billRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!billRef.current) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Bill #${order.orderNumber}</title>
      <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Courier New', monospace; padding: 12px; font-size: 12px; max-width: 300px; margin: 0 auto; } .center { text-align: center; } .bold { font-weight: bold; } .line { border-top: 1px dashed #333; margin: 8px 0; } .row { display: flex; justify-content: space-between; padding: 2px 0; } .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-weight: bold; font-size: 14px; } h2 { font-size: 16px; margin-bottom: 4px; }</style>
      </head><body>${billRef.current.innerHTML}<script>window.onload = function() { window.print(); window.close(); }<\/script></body></html>
    `);
    printWindow.document.close();
  };

  const orderItems = (order.items || []) as Array<Record<string, unknown>>;
  const subtotal = (order.subtotalCents || 0) as number;
  const discount = (order.discountCents || 0) as number;
  const tax = (order.taxCents || 0) as number;
  const total = (order.totalCents || 0) as number;
  const halfTax = Math.round(tax / 2);
  const table = order.table as Record<string, unknown> | null;

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div ref={billRef} className="rounded-t-2xl bg-white text-black p-6">
          <div className="text-center mb-3">
            <h2 className="text-lg font-black">MealStack</h2>
            <p className="text-[10px] text-gray-500">Restaurant Management System</p>
            <div className="border-t border-dashed border-gray-300 mt-3 pt-2">
              <p className="text-xs font-bold">Bill #{order.orderNumber as number}</p>
              <p className="text-[10px] text-gray-500">{new Date((order.createdAt as string) || Date.now()).toLocaleString()}</p>
              {table && <p className="text-[10px] text-gray-500">Table: {table.number as number}</p>}
              <p className="text-[10px] text-gray-500 capitalize">
                {((order.orderType as string) || "DINE_IN").replace("_", " ").toLowerCase()}
                {order.paymentMethod ? ` \u00B7 ${order.paymentMethod as string}` : ""}
              </p>
            </div>
          </div>
          <div className="border-t border-dashed border-gray-300" />
          <div className="py-2 space-y-1">
            <div className="flex text-[10px] font-bold text-gray-500 uppercase">
              <span className="flex-1">Item</span><span className="w-8 text-center">Qty</span><span className="w-16 text-right">Amt</span>
            </div>
            {orderItems.map((item) => (
              <div key={item.id as string} className="flex text-xs">
                <span className="flex-1 truncate">{item.productName as string}</span>
                <span className="w-8 text-center text-gray-600">{item.qty as number}</span>
                <span className="w-16 text-right font-semibold">{formatCents((item.unitPrice as number) * (item.qty as number))}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-gray-300" />
          <div className="py-2 space-y-0.5">
            <div className="flex justify-between text-xs"><span className="text-gray-500">Subtotal</span><span>{formatCents(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-xs text-emerald-600"><span>Discount</span><span>-{formatCents(discount)}</span></div>}
            <div className="flex justify-between text-xs"><span className="text-gray-500">CGST</span><span>{formatCents(halfTax)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">SGST</span><span>{formatCents(halfTax)}</span></div>
            <div className="border-t border-dashed border-gray-300 pt-1.5 mt-1.5 flex justify-between text-sm font-black">
              <span>TOTAL</span><span>{formatCents(total)}</span>
            </div>
          </div>
          <div className="border-t border-dashed border-gray-300 mt-2 pt-3 text-center">
            <p className="text-[10px] text-gray-400">Thank you for dining with us!</p>
            <p className="text-[10px] text-gray-400">Powered by MealStack</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-muted py-3 text-sm font-bold ring-1 ring-border hover:bg-accent transition-all">
            <Printer className="h-4 w-4" /> Print Bill
          </button>
          <button onClick={onNewOrder} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all">
            <Plus className="h-4 w-4" /> New Order
          </button>
        </div>
      </div>
    </div>
  );
}
