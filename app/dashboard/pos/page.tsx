"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { usePosStore } from "@/stores/use-pos-store";
import type { OrderType, PaymentMethod } from "@/stores/use-pos-store";
import { formatCents, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  Loader2,
  Search,
  UtensilsCrossed,
  Receipt,
  Truck,
  Coffee,
  ChevronRight,
  X,
  Printer,
  CreditCard,
  Smartphone,
  Banknote,
  Percent,
  Users,
  Hash,
  Check,
  Armchair,
  Gift,
  Tag,
  Sparkles,
  Menu,
  LayoutDashboard,
  ChefHat,
  Package,
  UserCircle,
  BarChart3,
  Settings,
  LogOut,
  ToggleLeft,
  Store,
  Radio,
  ClipboardList,
  Clock,
  Pause,
  BellRing,
  ArrowLeft,
  Grid3X3,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; sortOrder: number };
type ProductVariant = { id: string; name: string; priceCents: number; sortOrder: number };
type Product = {
  id: string;
  name: string;
  priceCents: number;
  isVeg: boolean;
  image: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  mealProduct: { id: string; name: string; priceCents: number } | null;
  variants: ProductVariant[];
};
type Table = { id: string; number: number; capacity: number };

const ORDER_TYPES: { value: OrderType; label: string; icon: typeof UtensilsCrossed }[] = [
  { value: "DINE_IN", label: "Dine In", icon: UtensilsCrossed },
  { value: "TAKEAWAY", label: "Takeaway", icon: Coffee },
  { value: "DELIVERY", label: "Delivery", icon: Truck },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote; color: string }[] = [
  { value: "CASH", label: "Cash", icon: Banknote, color: "bg-emerald-500 hover:bg-emerald-600" },
  { value: "UPI", label: "UPI", icon: Smartphone, color: "bg-violet-500 hover:bg-violet-600" },
  { value: "CARD", label: "Card", icon: CreditCard, color: "bg-blue-500 hover:bg-blue-600" },
];

const GST_RATE = 5; // 5% GST (2.5% CGST + 2.5% SGST)

// ─── Main POS Component ─────────────────────────────────────────────────────

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [lastOrder, setLastOrder] = useState<Record<string, unknown> | null>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showBogoModal, setShowBogoModal] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [mealProduct, setMealProduct] = useState<Product | null>(null); // product selected for meal option
  const [bogoProducts, setBogoProducts] = useState<Set<string>>(new Set());
  const [covers, setCovers] = useState(1);
  const [selectedWaiter, setSelectedWaiter] = useState<string | null>(null);
  const [showCustomDiscount, setShowCustomDiscount] = useState(false);
  const [customDiscountInput, setCustomDiscountInput] = useState("");
  const [bogoSearch, setBogoSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const {
    items, orderType, tableId, tableNumber, notes,
    discountPercent, paymentMethod,
    addItem, removeItem, updateQty, clearCart,
    setOrderType, setTableId, setNotes,
    setDiscountPercent, setPaymentMethod,
  } = usePosStore();

  const { toast } = useToast();

  // ── Computed values ────────────────────────────────────────────────────────
  const subtotalCents = useMemo(
    () => items.reduce((sum, i) => sum + i.priceCents * i.qty, 0),
    [items]
  );
  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.qty, 0),
    [items]
  );

  // BOGO: for each BOGO product, every 2nd item is free
  // BOGO: item is completely free — deduct its full price
  const bogoCents = useMemo(() => {
    let total = 0;
    for (const item of items) {
      if (bogoProducts.has(item.productId)) {
        total += item.priceCents * item.qty;
      }
    }
    return total;
  }, [items, bogoProducts]);

  const afterBogoSubtotal = subtotalCents - bogoCents;
  const discountCents = useMemo(
    () => Math.round(afterBogoSubtotal * (discountPercent / 100)),
    [afterBogoSubtotal, discountPercent]
  );
  const taxableAmount = afterBogoSubtotal - discountCents;
  const cgstCents = useMemo(() => Math.round(taxableAmount * (GST_RATE / 2 / 100)), [taxableAmount]);
  const sgstCents = cgstCents;
  const totalCents = taxableAmount + cgstCents + sgstCents;

  // BOGO helpers
  const toggleBogoProduct = useCallback((productId: string) => {
    setBogoProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const clearBogo = useCallback(() => {
    setBogoProducts(new Set());
  }, []);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [pRes, cRes, tRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/tables"),
      ]);
      if (pRes.ok) {
        const d = await pRes.json();
        setProducts(Array.isArray(d) ? d : d.data || []);
      }
      if (cRes.ok) {
        const d = await cRes.json();
        setCategories(Array.isArray(d) ? d : d.data || []);
      }
      if (tRes.ok) {
        const d = await tRes.json();
        const tableList = Array.isArray(d) ? d : d.data || [];
        setTables(tableList);
        // Auto-select Table 1 if no table selected and dine-in
        if (!tableId && tableList.length > 0) {
          const table1 = tableList.find((t: Table) => t.number === 1) || tableList[0];
          setTableId(table1.id, table1.number);
        }
      }
    } catch {
      toast({ title: "Error", description: "Failed to load POS data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Keyboard shortcut: focus search with /
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          searchRef.current?.focus();
        }
      }
      if (e.key === "Escape") {
        if (mealProduct) setMealProduct(null);
        if (showPayment) setShowPayment(false);
        if (showBill) setShowBill(false);
        if (showTablePicker) setShowTablePicker(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showPayment, showBill, showTablePicker]);

  // ── Filtered products ──────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCategory === "all" || p.categoryId === activeCategory;
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleProductTap = useCallback((product: Product) => {
    // If product has size variants — always show size picker (even if in cart)
    if (product.variants && product.variants.length > 0) {
      setMealProduct(product);
      return;
    }

    const inCart = items.find(i => i.productId === product.id);
    if (inCart) {
      updateQty(product.id, inCart.qty + 1);
    } else if (product.mealProduct) {
      setMealProduct(product);
    } else {
      addItem({
        productId: product.id,
        productName: product.name,
        priceCents: product.priceCents,
        qty: 1,
      });
    }
  }, [items, updateQty, addItem]);

  const handleAddSingle = useCallback(() => {
    if (!mealProduct) return;
    addItem({
      productId: mealProduct.id,
      productName: mealProduct.name,
      priceCents: mealProduct.priceCents,
      qty: 1,
    });
    setMealProduct(null);
  }, [mealProduct, addItem]);

  const handleAddVariant = useCallback((product: Product, variant: ProductVariant) => {
    // Use composite key for cart tracking, but store real productId for API
    const cartKey = `${product.id}_${variant.id}`;
    const existing = items.find(i => i.productId === cartKey);
    if (existing) {
      updateQty(cartKey, existing.qty + 1);
    } else {
      addItem({
        productId: cartKey,
        productName: `${product.name} (${variant.name})`,
        priceCents: variant.priceCents,
        qty: 1,
      });
    }
    setMealProduct(null);
  }, [items, updateQty, addItem]);

  const handleAddAsMeal = useCallback(() => {
    if (!mealProduct?.mealProduct) return;
    addItem({
      productId: mealProduct.mealProduct.id,
      productName: mealProduct.mealProduct.name,
      priceCents: mealProduct.mealProduct.priceCents,
      qty: 1,
    });
    setMealProduct(null);
  }, [mealProduct, addItem, toast]);

  // ── Print receipt to thermal printer ──────────────────────────────────────
  const printReceipt = useCallback((order: Record<string, unknown>, type: "bill" | "kot") => {
    const orderItems = (order.items || []) as Array<Record<string, unknown>>;
    const subtotal = (order.subtotalCents || 0) as number;
    const discount = (order.discountCents || 0) as number;
    const tax = (order.taxCents || 0) as number;
    const total = (order.totalCents || 0) as number;
    const halfTax = Math.round(tax / 2);
    const table = order.table as Record<string, unknown> | null;
    const orderNum = order.orderNumber as number;
    const orderTypeName = ((order.orderType as string) || "DINE_IN").replace("_", " ");

    const isKot = type === "kot";

    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html><html><head><title>${isKot ? "KOT" : "Bill"} #${orderNum}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 8px; font-size: 12px; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .big { font-size: 16px; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; padding: 1px 0; }
  .items th { text-align: left; font-size: 10px; border-bottom: 1px solid #000; padding: 2px 0; }
  .items td { padding: 2px 0; font-size: 11px; vertical-align: top; }
  .items { width: 100%; border-collapse: collapse; }
  .right { text-align: right; }
  .kot-header { text-align: center; font-size: 20px; font-weight: bold; border: 2px solid #000; padding: 4px; margin-bottom: 8px; }
  @media print { body { width: 100%; } @page { margin: 0; size: 80mm auto; } }
</style></head><body>`);

    if (isKot) {
      // KOT slip — kitchen order ticket
      printWindow.document.write(`
        <div class="kot-header">KOT #${orderNum}</div>
        <div class="row"><span>${orderTypeName}</span><span>${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
        ${table ? `<div class="bold">Table: ${table.number}</div>` : ""}
        <div class="line"></div>
        <table class="items"><tr><th>Item</th><th class="right">Qty</th></tr>`);
      for (const item of orderItems) {
        printWindow.document.write(`<tr><td>${item.productName}</td><td class="right bold">${item.qty}</td></tr>`);
        if (item.notes) printWindow.document.write(`<tr><td colspan="2" style="font-size:10px;font-style:italic;">  * ${item.notes}</td></tr>`);
      }
      printWindow.document.write(`</table>`);
      if (order.notes) printWindow.document.write(`<div class="line"></div><div style="font-size:10px;">Note: ${order.notes}</div>`);
      printWindow.document.write(`<div class="line"></div><div class="center" style="font-size:10px;">${new Date().toLocaleString()}</div>`);
    } else {
      // Bill receipt
      printWindow.document.write(`
        <div class="center bold big">MealStack</div>
        <div class="center" style="font-size:10px;margin-top:2px;">Restaurant Management System</div>
        <div class="line"></div>
        <div class="row bold"><span>Bill #${orderNum}</span><span>${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
        <div class="row"><span>${orderTypeName}</span><span>${paymentMethod}</span></div>
        ${table ? `<div>Table: ${table.number}</div>` : ""}
        <div class="line"></div>
        <table class="items">
          <tr><th>Item</th><th class="right">Qty</th><th class="right">Amt</th></tr>`);
      for (const item of orderItems) {
        const amt = ((item.unitPrice as number) || (item.priceCents as number) || 0) * ((item.qty as number) || 1);
        printWindow.document.write(`<tr><td>${item.productName}</td><td class="right">${item.qty}</td><td class="right">$${(amt / 100).toFixed(2)}</td></tr>`);
      }
      printWindow.document.write(`</table>
        <div class="line"></div>
        <div class="row"><span>Subtotal</span><span>$${(subtotal / 100).toFixed(2)}</span></div>
        ${discount > 0 ? `<div class="row"><span>Discount</span><span>-$${(discount / 100).toFixed(2)}</span></div>` : ""}
        <div class="row"><span>CGST</span><span>$${(halfTax / 100).toFixed(2)}</span></div>
        <div class="row"><span>SGST</span><span>$${(halfTax / 100).toFixed(2)}</span></div>
        <div class="line"></div>
        <div class="row bold big"><span>TOTAL</span><span>$${(total / 100).toFixed(2)}</span></div>
        <div class="line"></div>
        <div class="center" style="font-size:10px;margin-top:4px;">Thank you! Visit again.</div>
        <div class="center" style="font-size:9px;margin-top:2px;">${new Date().toLocaleString()}</div>`);
    }

    printWindow.document.write(`</body><script>window.onload=function(){window.print();window.close();}<\/script></html>`);
    printWindow.document.close();
  }, [paymentMethod]);

  // ── Place order with action type ────────────────────────────────────────
  const handlePlaceOrder = async (action: "save" | "save-print" | "save-ebill" | "kot" | "kot-print" | "hold" = "save") => {
    if (action === "hold") {
      toast({ title: "Order held" });
      return;
    }

    if (items.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    if (orderType === "DINE_IN" && !tableId) {
      setShowTablePicker(true);
      toast({ title: "Select a table for dine-in", variant: "destructive" });
      return;
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          tableId: orderType === "DINE_IN" ? tableId : undefined,
          notes: notes || undefined,
          items: items.map((i) => ({
            // Variant items have composite key "productId_variantId" — extract real productId
            productId: i.productId.includes("_") ? i.productId.split("_")[0] : i.productId,
            qty: i.qty,
            notes: i.notes,
            priceCents: i.priceCents,
            variantName: i.productId.includes("_") ? i.productName.replace(/^.+\(/, "").replace(/\)$/, "") : undefined,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to place order");
      }

      const order = await res.json();

      // Process payment (skip for KOT-only)
      let finalOrder = order;
      if (action !== "kot" && action !== "kot-print") {
        const payRes = await fetch(`/api/pos/orders/${order.id}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            paymentMethod,
            discountCents,
          }),
        });
        if (payRes.ok) {
          finalOrder = await payRes.json();
        }
      }

      // Auto-print based on action
      if (action === "save-print") {
        printReceipt({ ...finalOrder, paymentMethod }, "bill");
      } else if (action === "kot-print") {
        printReceipt(finalOrder, "kot");
      } else if (action === "kot") {
        // KOT only — no bill print, just send to kitchen
      } else if (action === "save-ebill") {
        // E-Bill: save and show on screen
        setLastOrder({ ...finalOrder, paymentMethod });
        setShowBill(true);
      }

      // Clear cart and start new order
      if (action !== "save-ebill") {
        toast({ title: `Order #${order.orderNumber} placed!` });
        clearCart();
        // Auto-select Table 1 for next order
        if (tables.length > 0) {
          const t1 = tables.find((t) => t.number === 1) || tables[0];
          setTableId(t1.id, t1.number);
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to place order",
        variant: "destructive",
      });
    } finally {
      setPlacing(false);
    }
  };

  const handleSelectTable = (table: Table) => {
    setTableId(table.id, table.number);
    setShowTablePicker(false);
  };

  const handleNewOrder = () => {
    clearCart();
    setShowBill(false);
    setLastOrder(null);
    // Auto-select Table 1
    if (tables.length > 0) {
      const t1 = tables.find((t) => t.number === 1) || tables[0];
      setTableId(t1.id, t1.number);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="text-sm text-gray-400">Loading POS...</p>
        </div>
      </div>
    );
  }

  // ─── BILL VIEW ─────────────────────────────────────────────────────────────
  if (showBill && lastOrder) {
    return <BillView order={lastOrder} onNewOrder={handleNewOrder} />;
  }

  // ─── NAV ITEMS for hamburger menu (Petpooja-style) ────────────────────────
  const navItems = [
    { label: "Billing", href: "/dashboard/pos", icon: Receipt, active: true },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Operations", href: "/dashboard/operations", icon: Grid3X3 },
    { label: "Kitchen", href: "/dashboard/kds", icon: ChefHat },
    { label: "Inventory", href: "/dashboard/inventory", icon: Package },
    { label: "Staff", href: "/dashboard/staff", icon: Users },
    { label: "Customers", href: "/dashboard/customers", icon: UserCircle },
    { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    { label: "Subscription", href: "/dashboard/subscription", icon: CreditCard },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  // ─── MAIN POS LAYOUT (full screen, covers sidebar/header) ────────────────
  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-gray-950 text-white">
      {/* ═══ TOP HEADER BAR ═══ */}
      <div className="flex items-center gap-3 shrink-0 border-b border-gray-800 bg-gray-900 px-4 py-2">
        {/* Hamburger */}
        <button
          onClick={() => setShowNav(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo */}
        <Image src="/images/logo-compact-dark.png" alt="Meal Stack" width={200} height={80} className="h-10 w-auto shrink-0" />

        <div className="h-6 w-px bg-gray-700 mx-1" />

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            ref={searchRef}
            type="text"
            placeholder='Search menu... (press "/")'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-gray-800 py-2 pl-9 pr-4 text-sm text-white placeholder-gray-500 outline-none ring-1 ring-gray-700 transition-all focus:ring-orange-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Order type tabs — Petpooja full-width style */}
        <div className="flex">
          {ORDER_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setOrderType(t.value);
                if (t.value === "DINE_IN" && !tableId && tables.length > 0) {
                  const t1 = tables.find((tb) => tb.number === 1) || tables[0];
                  setTableId(t1.id, t1.number);
                }
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 px-5 py-1.5 text-xs font-bold transition-all border-b-2",
                orderType === t.value
                  ? "border-orange-500 text-orange-400 bg-orange-500/10"
                  : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right action icons — Petpooja style */}
        <div className="flex items-center gap-0.5">
          {[
            { icon: ToggleLeft, label: "Item On/Off", href: "/dashboard/inventory" },
            { icon: Store, label: "Store", href: "/dashboard/operations" },
            { icon: Radio, label: "Live View", href: "/dashboard/kds" },
            { icon: ClipboardList, label: "Orders", href: "/dashboard/pos/orders" },
            { icon: Clock, label: "Recent" },
            { icon: Pause, label: "Hold" },
            { icon: BellRing, label: "Alerts" },
            { icon: LogOut, label: "Logout", action: "logout" },
          ].map((item) => {
            const isLogout = (item as { action?: string }).action === "logout";
            const content = (
              <div
                key={item.label}
                onClick={isLogout ? () => signOut({ callbackUrl: "/" }) : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 transition-colors cursor-pointer",
                  isLogout ? "text-gray-400 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
                title={item.label}
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span className="text-[9px] font-medium leading-tight">{item.label}</span>
              </div>
            );
            if (item.href) return <Link key={item.label} href={item.href}>{content}</Link>;
            return <div key={item.label}>{content}</div>;
          })}
        </div>
      </div>

      {/* ═══ DINE-IN SUB-BAR — Petpooja style ═══ */}
      {orderType === "DINE_IN" && (
        <div className="flex items-center shrink-0 border-b border-gray-800 bg-gray-900/60 px-4 py-1.5 gap-3">
          {/* Table selector */}
          <button
            onClick={() => setShowTablePicker(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-gray-700 hover:ring-orange-500/50 transition-all"
          >
            <Armchair className="h-3.5 w-3.5 text-orange-400" />
            Table {tableNumber || 1}
          </button>

          {/* Covers (guests) */}
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-[10px] text-gray-500 font-semibold">Covers</span>
            <div className="flex items-center rounded-md bg-gray-800 ring-1 ring-gray-700">
              <button
                onClick={() => setCovers(Math.max(1, covers - 1))}
                className="flex h-6 w-6 items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-xs font-bold text-white">{covers}</span>
              <button
                onClick={() => setCovers(covers + 1)}
                className="flex h-6 w-6 items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Quick table buttons */}
          <div className="flex items-center gap-1 ml-2">
            {tables.slice(0, 8).map((t) => (
              <button
                key={t.id}
                onClick={() => setTableId(t.id, t.number)}
                className={cn(
                  "flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[11px] font-bold transition-all",
                  tableId === t.id
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-gray-800 text-gray-500 ring-1 ring-gray-700 hover:text-white hover:ring-gray-600"
                )}
              >
                {t.number}
              </button>
            ))}
            {tables.length > 8 && (
              <button
                onClick={() => setShowTablePicker(true)}
                className="flex h-7 items-center justify-center rounded-md px-2 text-[10px] font-bold bg-gray-800 text-gray-500 ring-1 ring-gray-700 hover:text-white transition-all"
              >
                More...
              </button>
            )}
          </div>

          <div className="ml-auto text-[10px] text-gray-500 font-semibold">
            Dine In
          </div>
        </div>
      )}

      {/* ═══ BODY: Categories + Products + Cart ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ═══ LEFT: Categories ═══ */}
        <div className="flex w-[100px] shrink-0 flex-col border-r border-gray-800 bg-gray-900 overflow-y-auto scrollbar-thin">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "flex flex-col items-center gap-1 w-full px-2 py-3 text-[10px] font-bold uppercase tracking-wider transition-all border-l-[3px]",
              activeCategory === "all"
                ? "border-orange-500 bg-gray-800 text-orange-400"
                : "border-transparent text-gray-500 hover:bg-gray-800/50 hover:text-gray-300"
            )}
          >
            <Hash className="h-4.5 w-4.5" />
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex flex-col items-center gap-1 w-full px-2 py-3 text-[10px] font-bold uppercase tracking-wider transition-all border-l-[3px]",
                activeCategory === cat.id
                  ? "border-orange-500 bg-gray-800 text-orange-400"
                  : "border-transparent text-gray-500 hover:bg-gray-800/50 hover:text-gray-300"
              )}
            >
              <span className="text-base">{getCategoryEmoji(cat.name)}</span>
              <span className="truncate w-full text-center leading-tight">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* ═══ CENTER: Products ═══ */}
        <div className="flex flex-1 flex-col overflow-hidden">
        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-600">
              <Search className="h-12 w-12" />
              <p className="text-sm">No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {filteredProducts.map((product) => {
                const inCart = items.find((i) => i.productId === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductTap(product)}
                    className={cn(
                      "group relative flex flex-col rounded-xl p-3 text-left transition-all duration-100 active:scale-[0.97]",
                      inCart
                        ? "bg-orange-500/15 ring-1 ring-orange-500/50"
                        : "bg-gray-800/60 hover:bg-gray-800 ring-1 ring-gray-700/50 hover:ring-gray-600"
                    )}
                  >
                    {/* Veg indicator */}
                    <div className={cn(
                      "absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-[3px] border-[1.5px]",
                      product.isVeg ? "border-green-500" : "border-red-500"
                    )}>
                      <div className={cn("h-1.5 w-1.5 rounded-full", product.isVeg ? "bg-green-500" : "bg-red-500")} />
                    </div>

                    {/* Qty badge */}
                    {inCart && (
                      <div className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white shadow-lg">
                        {inCart.qty}
                      </div>
                    )}

                    <p className="pr-5 text-xs font-semibold leading-snug text-gray-100 line-clamp-2">
                      {product.name}
                    </p>
                    <span className="mt-0.5 text-[10px] text-gray-500">{product.category?.name}</span>
                    <div className="mt-auto pt-2 flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-orange-400">
                        {formatCents(product.priceCents)}
                      </span>
                      {product.variants && product.variants.length > 0 && (
                        <span className="rounded bg-sky-500/20 px-1 py-0.5 text-[8px] font-bold text-sky-400 ring-1 ring-sky-500/25">
                          SIZES
                        </span>
                      )}
                      {product.mealProduct && (
                        <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[8px] font-bold text-amber-400 ring-1 ring-amber-500/25">
                          MEAL
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT: Cart Panel ═══ */}
      <div className="flex w-[480px] flex-col border-l border-gray-800 bg-gray-900">
        {/* Cart header */}
        <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
          <ShoppingCart className="h-5 w-5 text-orange-500" />
          <span className="text-sm font-bold">Order</span>
          {itemCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold">
              {itemCount}
            </span>
          )}
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="ml-auto text-gray-500 hover:text-red-400 transition-colors"
              title="Clear cart"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
                <ShoppingCart className="h-7 w-7 text-gray-600" />
              </div>
              <p className="text-xs text-gray-500">Tap items to add to order</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {items.map((item, idx) => (
                <div key={item.productId} className="group flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-800/30 transition-colors">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-800 text-[10px] font-bold text-gray-400">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-gray-200 truncate">{item.productName}</p>
                      {bogoProducts.has(item.productId) && (
                        <span className="shrink-0 flex items-center gap-0.5 rounded bg-emerald-500/20 px-1 py-0.5 text-[8px] font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                          <Gift className="h-2.5 w-2.5" />BOGO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {bogoProducts.has(item.productId) ? (
                        <span className="text-[10px] text-emerald-400 font-bold line-through decoration-gray-600">
                          {formatCents(item.priceCents)}
                        </span>
                      ) : (
                        <p className="text-[10px] text-gray-500">{formatCents(item.priceCents)}</p>
                      )}
                    </div>
                  </div>
                  {/* Qty stepper */}
                  <div className="flex items-center rounded-md bg-gray-800 ring-1 ring-gray-700">
                    <button
                      onClick={() => updateQty(item.productId, item.qty - 1)}
                      className="flex h-6 w-6 items-center justify-center text-gray-400 hover:text-orange-400 transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-[11px] font-bold text-white">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.qty + 1)}
                      className="flex h-6 w-6 items-center justify-center text-gray-400 hover:text-orange-400 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className={cn("w-16 text-right text-xs font-bold", bogoProducts.has(item.productId) ? "text-emerald-400" : "text-white")}>
                    {bogoProducts.has(item.productId) ? "FREE" : formatCents(item.priceCents * item.qty)}
                  </span>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── BOTTOM PANEL ─── */}
        <div className="border-t border-gray-700/30 mt-auto bg-[#0d1117]">
          {/* Total + Offers row */}
          <div className="flex items-center px-4 py-3">
            <button
              onClick={() => setShowBogoModal(true)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all active:scale-[0.96]",
                bogoProducts.size > 0
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25 hover:bg-emerald-500/25"
                  : "bg-gray-800 text-gray-400 ring-1 ring-gray-700 hover:text-white hover:ring-gray-600"
              )}
            >
              <Gift className="h-3.5 w-3.5" />
              BOGO
              {bogoProducts.size > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white px-1">
                  {bogoProducts.size}
                </span>
              )}
            </button>

            <button className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3.5 py-1.5 text-[11px] font-bold text-gray-400 ring-1 ring-gray-700 hover:text-white hover:ring-gray-600 transition-all active:scale-[0.96]">
              Split
            </button>

            {/* Discount — shows active discount or dropdown trigger */}
            <div className="relative ml-1">
              {discountPercent > 0 ? (
                <div className="flex items-center gap-1">
                  <span className="flex items-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-1.5 text-[11px] font-bold text-white">
                    <Percent className="h-3 w-3" />
                    {discountPercent}% OFF
                  </span>
                  <button
                    onClick={() => setDiscountPercent(0)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-gray-500 hover:text-red-400 ring-1 ring-gray-700 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCustomDiscount(!showCustomDiscount)}
                  className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3.5 py-1.5 text-[11px] font-bold text-gray-400 ring-1 ring-gray-700 hover:text-white hover:ring-gray-600 transition-all active:scale-[0.96]"
                >
                  <Percent className="h-3 w-3" />
                  Offer
                </button>
              )}

              {/* Discount dropdown */}
              {showCustomDiscount && (
                <div className="absolute bottom-full left-0 mb-2 w-52 rounded-xl bg-gray-800 border border-gray-700 shadow-2xl shadow-black/50 p-2 z-10">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 mb-2">Apply Discount</p>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[5, 10, 15, 20, 25, 30, 40, 50].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => { setDiscountPercent(pct); setShowCustomDiscount(false); }}
                        className="rounded-lg bg-gray-700/50 py-2 text-xs font-bold text-white hover:bg-orange-500 active:scale-[0.95] transition-all"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 px-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={customDiscountInput}
                      onChange={(e) => setCustomDiscountInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = parseInt(customDiscountInput);
                          if (!isNaN(val) && val >= 0 && val <= 100) setDiscountPercent(val);
                          setShowCustomDiscount(false);
                          setCustomDiscountInput("");
                        }
                        if (e.key === "Escape") { setShowCustomDiscount(false); setCustomDiscountInput(""); }
                      }}
                      autoFocus
                      placeholder="Custom %"
                      className="flex-1 h-8 rounded-lg bg-gray-900 px-3 text-xs font-bold text-white outline-none border border-gray-600 focus:border-orange-500 placeholder-gray-600"
                    />
                    <button
                      onClick={() => {
                        const val = parseInt(customDiscountInput);
                        if (!isNaN(val) && val >= 0 && val <= 100) setDiscountPercent(val);
                        setShowCustomDiscount(false);
                        setCustomDiscountInput("");
                      }}
                      className="flex h-8 items-center justify-center rounded-lg bg-orange-500 px-3 text-xs font-bold text-white hover:bg-orange-600 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Savings summary */}
            {bogoCents > 0 && (
              <span className="text-[10px] font-bold text-emerald-400 ml-1">-{formatCents(bogoCents)}</span>
            )}

            <div className="ml-auto flex items-baseline gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total</span>
              <span className="text-3xl font-black text-orange-400 tabular-nums">{formatCents(totalCents)}</span>
            </div>
          </div>

          {/* Payment row */}
          <div className="flex items-center px-4 py-2 gap-1 border-t border-gray-800/60">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setPaymentMethod(m.value)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold transition-all",
                  paymentMethod === m.value
                    ? "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30"
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                )}
              >
                <m.icon className="h-4 w-4" />
                {m.label}
                {paymentMethod === m.value && <Check className="h-3 w-3 text-orange-400" strokeWidth={3} />}
              </button>
            ))}
            <button className="ml-1 text-[11px] font-medium text-gray-600 hover:text-gray-400 transition-colors px-2">
              More
            </button>

            <div className="ml-auto flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer h-4 w-4 rounded border-2 border-gray-600 bg-transparent appearance-none checked:bg-orange-500 checked:border-orange-500 transition-all cursor-pointer" />
                  <Check className="absolute h-2.5 w-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                </div>
                <span className="text-[11px] font-semibold text-gray-500">Paid</span>
              </label>
            </div>
          </div>

          {/* Notes row */}
          <div className="px-4 py-2 border-t border-gray-800/60">
            <input
              type="text"
              placeholder="Order notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg bg-gray-800/60 px-4 py-2.5 text-xs text-white placeholder-gray-600 outline-none border border-gray-700/40 focus:border-orange-500/40 transition-all"
            />
          </div>

          {/* Action buttons — all 6 like Petpooja */}
          <div className="grid grid-cols-6 gap-1.5 px-3 py-3 border-t border-gray-800/60">
            <button
              onClick={() => handlePlaceOrder("save")}
              disabled={placing}
              className="flex items-center justify-center rounded-lg bg-orange-500 py-3 text-[11px] font-extrabold text-white hover:bg-orange-600 active:scale-[0.96] transition-all disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => handlePlaceOrder("save-print")}
              disabled={placing}
              className="flex flex-col items-center justify-center rounded-lg bg-orange-500 py-2.5 text-[11px] font-extrabold text-white hover:bg-orange-600 active:scale-[0.96] transition-all disabled:opacity-50 leading-tight"
            >
              <span>Save &</span><span>Print</span>
            </button>
            <button
              onClick={() => handlePlaceOrder("save-ebill")}
              disabled={placing}
              className="flex flex-col items-center justify-center rounded-lg bg-orange-500 py-2.5 text-[11px] font-extrabold text-white hover:bg-orange-600 active:scale-[0.96] transition-all disabled:opacity-50 leading-tight"
            >
              <span>Save &</span><span>EBill</span>
            </button>
            <button
              onClick={() => handlePlaceOrder("kot")}
              disabled={placing}
              className="flex items-center justify-center rounded-lg bg-gray-700 py-3 text-[11px] font-extrabold text-white hover:bg-gray-600 active:scale-[0.96] transition-all disabled:opacity-50"
            >
              KOT
            </button>
            <button
              onClick={() => handlePlaceOrder("kot-print")}
              disabled={placing}
              className="flex flex-col items-center justify-center rounded-lg bg-gray-700 py-2.5 text-[11px] font-extrabold text-white hover:bg-gray-600 active:scale-[0.96] transition-all disabled:opacity-50 leading-tight"
            >
              <span>KOT &</span><span>Print</span>
            </button>
            <button
              onClick={() => handlePlaceOrder("hold")}
              className="flex items-center justify-center rounded-lg bg-gray-800 py-3 text-[11px] font-extrabold text-gray-300 ring-1 ring-gray-700 hover:bg-gray-700 active:scale-[0.96] transition-all"
            >
              Hold
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* ═══ TABLE PICKER OVERLAY ═══ */}
      {showTablePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowTablePicker(false)}>
          <div className="mx-4 w-full max-w-2xl rounded-2xl bg-gray-900 p-6 shadow-2xl ring-1 ring-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Select Table</h2>
              <button onClick={() => setShowTablePicker(false)} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
              {tables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => handleSelectTable(table)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl p-4 transition-all active:scale-95",
                    tableId === table.id
                      ? "bg-orange-500 text-white ring-2 ring-orange-400 shadow-lg shadow-orange-500/30"
                      : "bg-gray-800 text-gray-300 ring-1 ring-gray-700 hover:ring-orange-500/50"
                  )}
                >
                  <Armchair className="h-6 w-6" />
                  <span className="text-lg font-black">{table.number}</span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Users className="h-3 w-3" />
                    {table.capacity}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PRODUCT OPTIONS POPUP (Sizes / Meal / Single) ═══ */}
      {mealProduct && (
        <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setMealProduct(null)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-gray-900 shadow-2xl ring-1 ring-gray-700 overflow-hidden mb-4 sm:mb-0" onClick={(e) => e.stopPropagation()}>
            {/* Item info */}
            <div className="px-5 pt-5 pb-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-[3px] border-[1.5px]",
                  mealProduct.isVeg ? "border-green-500" : "border-red-500"
                )}>
                  <div className={cn("h-1.5 w-1.5 rounded-full", mealProduct.isVeg ? "bg-green-500" : "bg-red-500")} />
                </div>
                <h2 className="text-lg font-bold text-white">{mealProduct.name}</h2>
              </div>
              <p className="text-xs text-gray-500">{mealProduct.category?.name}</p>
            </div>

            {/* Size variants — if product has sizes */}
            {mealProduct.variants && mealProduct.variants.length > 0 ? (
              <div className="px-5 pb-5 pt-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-3 text-center">Choose Size</p>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(mealProduct.variants.length, 4)}, 1fr)` }}>
                  {mealProduct.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => handleAddVariant(mealProduct, variant)}
                      className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-800 p-3.5 ring-1 ring-gray-700 hover:ring-orange-500/50 hover:bg-gray-800/80 active:scale-[0.95] transition-all"
                    >
                      <span className="text-xs font-bold text-white">{variant.name}</span>
                      <span className="text-base font-black text-orange-400">{formatCents(variant.priceCents)}</span>
                    </button>
                  ))}
                </div>

                {/* Also show meal option if available */}
                {mealProduct.mealProduct && (
                  <>
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-gray-700" />
                      <span className="text-[10px] text-gray-500 font-bold">OR</span>
                      <div className="flex-1 h-px bg-gray-700" />
                    </div>
                    <button
                      onClick={handleAddAsMeal}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 p-3 ring-1 ring-amber-500/30 hover:ring-amber-500/60 hover:bg-amber-500/15 active:scale-[0.96] transition-all"
                    >
                      <UtensilsCrossed className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Meal</span>
                      <span className="text-sm font-black text-amber-400">{formatCents(mealProduct.mealProduct.priceCents)}</span>
                    </button>
                  </>
                )}
              </div>
            ) : mealProduct.mealProduct ? (
              /* No sizes, but has meal — show Single vs Meal */
              <div className="flex gap-3 px-5 pb-5 pt-2">
                <button
                  onClick={handleAddSingle}
                  className="flex-1 flex flex-col items-center gap-2 rounded-xl bg-gray-800 p-4 ring-1 ring-gray-700 hover:ring-orange-500/50 hover:bg-gray-800/80 active:scale-[0.96] transition-all"
                >
                  <span className="text-xs font-bold text-white">Single</span>
                  <span className="text-lg font-black text-orange-400">{formatCents(mealProduct.priceCents)}</span>
                </button>
                <button
                  onClick={handleAddAsMeal}
                  className="flex-1 flex flex-col items-center gap-2 rounded-xl bg-amber-500/10 p-4 ring-1 ring-amber-500/30 hover:ring-amber-500/60 hover:bg-amber-500/15 active:scale-[0.96] transition-all"
                >
                  <span className="text-xs font-bold text-white">Meal</span>
                  <span className="text-lg font-black text-amber-400">{formatCents(mealProduct.mealProduct.priceCents)}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ═══ HAMBURGER NAV OVERLAY ═══ */}
      {showNav && (
        <div className="fixed inset-0 z-[70] flex" onClick={() => setShowNav(false)}>
          <div
            className="w-[260px] h-full bg-gray-900 border-r border-gray-800 shadow-2xl flex flex-col animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Brand */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
              <Image src="/images/logo-compact-dark.png" alt="Meal Stack" width={180} height={45} className="h-10 w-auto" />
              <button onClick={() => setShowNav(false)} className="ml-auto text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    (item as { active?: boolean }).active
                      ? "bg-orange-500/10 text-orange-400 shadow-sm"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <item.icon className={cn("h-[18px] w-[18px]", (item as { active?: boolean }).active && "text-orange-400")} />
                  {item.label}
                  {(item as { active?: boolean }).active && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-500" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Logout */}
            <div className="border-t border-gray-800 p-3">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="h-[18px] w-[18px]" />
                Sign Out
              </button>
            </div>
          </div>
          {/* Dark overlay */}
          <div className="flex-1 bg-black/60 backdrop-blur-sm" />
        </div>
      )}

      {/* ═══ BOGO OFFER MODAL ═══ */}
      {showBogoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { setShowBogoModal(false); setBogoSearch(""); }}>
          <div className="mx-4 w-full max-w-xl rounded-2xl bg-gray-900 shadow-2xl ring-1 ring-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-800 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                <Gift className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-white">BOGO - Buy One Get One Free</h2>
                <p className="text-[11px] text-gray-500">Select products to apply BOGO offer. Every 2nd item will be free.</p>
              </div>
              <button onClick={() => { setShowBogoModal(false); setBogoSearch(""); }} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Active BOGO summary */}
            {bogoProducts.size > 0 && (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">
                  {bogoProducts.size} product{bogoProducts.size > 1 ? "s" : ""} with BOGO active
                </span>
                {bogoCents > 0 && (
                  <span className="text-xs font-bold text-emerald-300 ml-auto">
                    Saving {formatCents(bogoCents)}
                  </span>
                )}
                <button
                  onClick={clearBogo}
                  className="ml-2 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Cart items only */}
            <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-800/50">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                  <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">Add items to cart first</p>
                </div>
              ) : items.map((cartItem) => {
                  const product = products.find(p => p.id === cartItem.productId);
                  const isActive = bogoProducts.has(cartItem.productId);
                  const savedAmount = isActive ? cartItem.priceCents * cartItem.qty : 0;

                  return (
                    <button
                      key={cartItem.productId}
                      onClick={() => toggleBogoProduct(cartItem.productId)}
                      className={cn(
                        "flex items-center gap-3 w-full px-5 py-3 text-left transition-all hover:bg-gray-800/50",
                        isActive && "bg-emerald-500/5"
                      )}
                    >
                      {/* Checkbox */}
                      <div className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                        isActive
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-gray-600 bg-gray-800"
                      )}>
                        {isActive && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-200 truncate">{cartItem.productName}</p>
                        <p className="text-[10px] text-gray-500">{formatCents(cartItem.priceCents)} &middot; Qty: {cartItem.qty}</p>
                      </div>

                      {/* Saved amount */}
                      {savedAmount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          FREE
                        </span>
                      )}

                      {/* BOGO tag */}
                      {isActive && (
                        <Tag className="h-4 w-4 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 border-t border-gray-800 px-5 py-4">
              <div className="flex-1 text-xs text-gray-500">
                Select items and add 2+ qty to get the free one
              </div>
              <button
                onClick={() => { setShowBogoModal(false); setBogoSearch(""); }}
                className="rounded-lg bg-emerald-500 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 active:scale-[0.97] transition-all shadow-lg shadow-emerald-500/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TotalRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex justify-between text-[11px]", className)}>
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-300">{value}</span>
    </div>
  );
}

// ─── Bill View ───────────────────────────────────────────────────────────────

function BillView({ order, onNewOrder }: { order: Record<string, unknown>; onNewOrder: () => void }) {
  const billRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!billRef.current) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill #${order.orderNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; padding: 12px; font-size: 12px; max-width: 300px; margin: 0 auto; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #333; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; padding: 2px 0; }
            .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-weight: bold; font-size: 14px; }
            h2 { font-size: 16px; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          ${billRef.current.innerHTML}
          <script>window.onload = function() { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const items = (order.items || []) as Array<Record<string, unknown>>;
  const subtotal = (order.subtotalCents || 0) as number;
  const discount = (order.discountCents || 0) as number;
  const tax = (order.taxCents || 0) as number;
  const total = (order.totalCents || 0) as number;
  const halfTax = Math.round(tax / 2);
  const table = order.table as Record<string, unknown> | null;

  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        {/* Bill receipt */}
        <div ref={billRef} className="rounded-t-2xl bg-white text-black p-6">
          <div className="text-center mb-3">
            <h2 className="text-lg font-black">MealStack</h2>
            <p className="text-[10px] text-gray-500">Restaurant Management System</p>
            <div className="border-t border-dashed border-gray-300 mt-3 pt-2">
              <p className="text-xs font-bold">Bill #{order.orderNumber as number}</p>
              <p className="text-[10px] text-gray-500">
                {new Date((order.createdAt as string) || Date.now()).toLocaleString()}
              </p>
              {table && (
                <p className="text-[10px] text-gray-500">Table: {table.number as number}</p>
              )}
              <p className="text-[10px] text-gray-500 capitalize">
                {((order.orderType as string) || "DINE_IN").replace("_", " ").toLowerCase()}
                {order.paymentMethod ? ` \u00B7 ${order.paymentMethod as string}` : ""}
              </p>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300" />

          {/* Items */}
          <div className="py-2 space-y-1">
            <div className="flex text-[10px] font-bold text-gray-500 uppercase">
              <span className="flex-1">Item</span>
              <span className="w-8 text-center">Qty</span>
              <span className="w-16 text-right">Amt</span>
            </div>
            {items.map((item) => (
              <div key={item.id as string} className="flex text-xs">
                <span className="flex-1 truncate">{item.productName as string}</span>
                <span className="w-8 text-center text-gray-600">{item.qty as number}</span>
                <span className="w-16 text-right font-semibold">
                  {formatCents((item.unitPrice as number) * (item.qty as number))}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300" />

          {/* Totals */}
          <div className="py-2 space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCents(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-emerald-600">
                <span>Discount</span>
                <span>-{formatCents(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">CGST</span>
              <span>{formatCents(halfTax)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">SGST</span>
              <span>{formatCents(halfTax)}</span>
            </div>
            <div className="border-t border-dashed border-gray-300 pt-1.5 mt-1.5 flex justify-between text-sm font-black">
              <span>TOTAL</span>
              <span>{formatCents(total)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 mt-2 pt-3 text-center">
            <p className="text-[10px] text-gray-400">Thank you for dining with us!</p>
            <p className="text-[10px] text-gray-400">Powered by MealStack</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gray-800 py-3 text-sm font-bold text-white ring-1 ring-gray-700 hover:bg-gray-700 transition-all"
          >
            <Printer className="h-4 w-4" />
            Print Bill
          </button>
          <button
            onClick={onNewOrder}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all"
          >
            <Plus className="h-4 w-4" />
            New Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("beverage") || lower.includes("drink")) return "\uD83E\uDD64";
  if (lower.includes("starter") || lower.includes("appetizer")) return "\uD83C\uDF5F";
  if (lower.includes("main") || lower.includes("entree") || lower.includes("curry")) return "\uD83C\uDF5B";
  if (lower.includes("dessert") || lower.includes("sweet")) return "\uD83C\uDF70";
  if (lower.includes("pizza")) return "\uD83C\uDF55";
  if (lower.includes("burger")) return "\uD83C\uDF54";
  if (lower.includes("salad")) return "\uD83E\uDD57";
  if (lower.includes("soup")) return "\uD83C\uDF5C";
  if (lower.includes("bread") || lower.includes("roti") || lower.includes("naan")) return "\uD83E\uDED3";
  if (lower.includes("rice") || lower.includes("biryani")) return "\uD83C\uDF5A";
  if (lower.includes("coffee") || lower.includes("tea") || lower.includes("chai")) return "\u2615";
  if (lower.includes("juice") || lower.includes("smoothie")) return "\uD83E\uDDC3";
  if (lower.includes("ice") || lower.includes("frozen")) return "\uD83C\uDF66";
  if (lower.includes("combo") || lower.includes("meal")) return "\uD83C\uDF71";
  if (lower.includes("snack") || lower.includes("fries")) return "\uD83C\uDF7F";
  if (lower.includes("seafood") || lower.includes("fish")) return "\uD83D\uDC1F";
  if (lower.includes("chicken") || lower.includes("wing")) return "\uD83C\uDF57";
  return "\uD83C\uDF7D\uFE0F";
}
