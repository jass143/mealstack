"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCents, formatDate } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type Supplier = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  _count?: { items: number };
};

type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unit: string;
  reorderLevel: number;
  costPerUnit: number;
  supplierId: string | null;
  isActive: boolean;
  createdAt: string;
  supplier: Supplier | null;
};

type InventoryTransaction = {
  id: string;
  inventoryItemId: string;
  type: "PURCHASE" | "USAGE" | "WASTE" | "ADJUSTMENT" | "RETURN";
  quantity: number;
  notes: string | null;
  createdAt: string;
  inventoryItem: { id: string; name: string; unit: string };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  PURCHASE: "bg-green-100 text-green-800",
  RETURN: "bg-blue-100 text-blue-800",
  USAGE: "bg-orange-100 text-orange-800",
  WASTE: "bg-red-100 text-red-800",
  ADJUSTMENT: "bg-purple-100 text-purple-800",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function InventoryPage() {
  // ── State ──────────────────────────────────────────────────────────────
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [txPagination, setTxPagination] = useState<Pagination | null>(null);
  const [txPage, setTxPage] = useState(1);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Menu products state
  type MenuProduct = {
    id: string;
    name: string;
    priceCents: number;
    sku: string | null;
    isVeg: boolean;
    isActive: boolean;
    category: { id: string; name: string } | null;
    mealProduct: { id: string; name: string; priceCents: number } | null;
  };
  const [menuProducts, setMenuProducts] = useState<MenuProduct[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [mealTarget, setMealTarget] = useState<MenuProduct | null>(null);
  const [mealPrice, setMealPrice] = useState("");

  // Form state - item
  const [itemForm, setItemForm] = useState({
    name: "",
    sku: "",
    quantity: 0,
    unit: "pcs",
    reorderLevel: 0,
    costPerUnit: 0,
    supplierId: "",
  });

  // Form state - transaction
  const [txForm, setTxForm] = useState({
    inventoryItemId: "",
    type: "PURCHASE" as string,
    quantity: 0,
    notes: "",
  });

  // Form state - supplier
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // ── Data fetching ─────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/inventory?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch {
      // silently handle
    }
  }, [search]);

  const fetchTransactions = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`/api/inventory/transactions?page=${page}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setTxPagination(data.pagination);
      }
    } catch {
      // silently handle
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch {
      // silently handle
    }
  }, []);

  // ── Menu products fetch ──────────────────────────────────────────────
  const fetchMenuProducts = useCallback(async () => {
    setMenuLoading(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.data || [];
        setMenuProducts(arr);
      }
    } catch { /* silently handle */ }
    setMenuLoading(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchItems(), fetchTransactions(), fetchSuppliers(), fetchMenuProducts()]);
      setLoading(false);
    };
    load();
  }, [fetchItems, fetchTransactions, fetchSuppliers, fetchMenuProducts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchItems]);

  const handleAddMeal = async () => {
    if (!mealTarget || !mealPrice) return;
    const priceCents = Math.round(parseFloat(mealPrice) * 100);
    if (isNaN(priceCents) || priceCents <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${mealTarget.id}/meal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceCents }),
      });
      if (res.ok) {
        setMealDialogOpen(false);
        setMealTarget(null);
        setMealPrice("");
        fetchMenuProducts();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to save meal");
      }
    } catch {
      setErrorMsg("Failed to save meal");
    }
    setSubmitting(false);
  };

  const handleRemoveMeal = async (productId: string) => {
    if (!confirm("Remove meal variant for this product?")) return;
    try {
      const res = await fetch(`/api/products/${productId}/meal`, { method: "DELETE" });
      if (res.ok) fetchMenuProducts();
    } catch { /* silently handle */ }
  };

  // ── Computed ──────────────────────────────────────────────────────────

  const lowStockItems = items.filter(
    (item) => item.quantity <= item.reorderLevel && item.isActive
  );
  const lowStockCount = lowStockItems.length;

  // ── Handlers ──────────────────────────────────────────────────────────

  function openAddItem() {
    setEditingItem(null);
    setItemForm({
      name: "",
      sku: "",
      quantity: 0,
      unit: "pcs",
      reorderLevel: 0,
      costPerUnit: 0,
      supplierId: "",
    });
    setErrorMsg("");
    setItemDialogOpen(true);
  }

  function openEditItem(item: InventoryItem) {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      sku: item.sku ?? "",
      quantity: item.quantity,
      unit: item.unit,
      reorderLevel: item.reorderLevel,
      costPerUnit: item.costPerUnit,
      supplierId: item.supplierId ?? "",
    });
    setErrorMsg("");
    setItemDialogOpen(true);
  }

  async function handleSaveItem() {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        name: itemForm.name,
        sku: itemForm.sku || undefined,
        quantity: Number(itemForm.quantity),
        unit: itemForm.unit || "pcs",
        reorderLevel: Number(itemForm.reorderLevel),
        costPerUnit: Number(itemForm.costPerUnit),
        supplierId: itemForm.supplierId || undefined,
      };

      const url = editingItem
        ? `/api/inventory/${editingItem.id}`
        : "/api/inventory";
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to save item");
        return;
      }

      setItemDialogOpen(false);
      fetchItems();
    } catch {
      setErrorMsg("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Deactivate this inventory item?")) return;
    const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    if (res.ok) fetchItems();
  }

  function openAddTransaction() {
    setTxForm({ inventoryItemId: "", type: "PURCHASE", quantity: 0, notes: "" });
    setErrorMsg("");
    setTxDialogOpen(true);
  }

  async function handleSaveTransaction() {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        inventoryItemId: txForm.inventoryItemId,
        type: txForm.type,
        quantity: Number(txForm.quantity),
        notes: txForm.notes || undefined,
      };

      const res = await fetch("/api/inventory/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to create transaction");
        return;
      }

      setTxDialogOpen(false);
      fetchTransactions(txPage);
      fetchItems();
    } catch {
      setErrorMsg("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function openAddSupplier() {
    setEditingSupplier(null);
    setSupplierForm({ name: "", email: "", phone: "", address: "" });
    setErrorMsg("");
    setSupplierDialogOpen(true);
  }

  function openEditSupplier(supplier: Supplier) {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
    });
    setErrorMsg("");
    setSupplierDialogOpen(true);
  }

  async function handleSaveSupplier() {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        name: supplierForm.name,
        email: supplierForm.email || undefined,
        phone: supplierForm.phone || undefined,
        address: supplierForm.address || undefined,
      };

      const url = editingSupplier
        ? `/api/suppliers/${editingSupplier.id}`
        : "/api/suppliers";
      const method = editingSupplier ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to save supplier");
        return;
      }

      setSupplierDialogOpen(false);
      fetchSuppliers();
      fetchItems(); // Refresh items in case supplier names changed
    } catch {
      setErrorMsg("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSupplier(id: string) {
    if (!confirm("Delete this supplier?")) return;
    const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Failed to delete supplier");
      return;
    }
    fetchSuppliers();
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
      </div>

      {/* Low stock alert banner */}
      {lowStockCount > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 font-semibold text-sm">
              Low Stock Alert:
            </span>
            <span className="text-amber-800 text-sm">
              {lowStockCount} item{lowStockCount !== 1 ? "s" : ""} below reorder level
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStockItems.slice(0, 5).map((item) => (
              <Badge
                key={item.id}
                variant="destructive"
                className="text-xs"
              >
                {item.name}: {item.quantity} {item.unit}
              </Badge>
            ))}
            {lowStockCount > 5 && (
              <span className="text-xs text-amber-600">
                +{lowStockCount - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="menu">Menu & Meals</TabsTrigger>
        </TabsList>

        {/* ═══════ ITEMS TAB ═══════ */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Inventory Items</CardTitle>
                <Button onClick={openAddItem}>Add Item</Button>
              </div>
              <div className="mt-2">
                <Input
                  placeholder="Search by name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No inventory items found. Add your first item to get started.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Reorder Level</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const isLow =
                        item.quantity <= item.reorderLevel && item.isActive;
                      return (
                        <TableRow
                          key={item.id}
                          className={
                            isLow
                              ? "bg-red-50 hover:bg-red-100"
                              : "cursor-pointer"
                          }
                          onClick={() => openEditItem(item)}
                        >
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.sku ?? "-"}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono ${
                              isLow ? "text-red-600 font-semibold" : ""
                            }`}
                          >
                            {item.quantity}
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right font-mono">
                            {item.reorderLevel}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCents(item.costPerUnit)}
                          </TableCell>
                          <TableCell>
                            {item.supplier?.name ?? "-"}
                          </TableCell>
                          <TableCell>
                            {isLow ? (
                              <Badge variant="destructive">Low Stock</Badge>
                            ) : (
                              <Badge variant="secondary">In Stock</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}
                            >
                              Deactivate
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ TRANSACTIONS TAB ═══════ */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transaction Log</CardTitle>
                <Button onClick={openAddTransaction}>Add Transaction</Button>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transactions recorded yet.
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(tx.createdAt)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {tx.inventoryItem.name}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                TRANSACTION_TYPE_COLORS[tx.type] ?? ""
                              }`}
                            >
                              {tx.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {tx.type === "USAGE" || tx.type === "WASTE"
                              ? `-${Math.abs(tx.quantity)}`
                              : tx.type === "ADJUSTMENT"
                              ? `=${tx.quantity}`
                              : `+${Math.abs(tx.quantity)}`}
                            {" "}
                            {tx.inventoryItem.unit}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {tx.notes ?? "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {txPagination && txPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing page {txPagination.page} of{" "}
                        {txPagination.totalPages} ({txPagination.total} total)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={txPagination.page <= 1}
                          onClick={() => {
                            const p = txPage - 1;
                            setTxPage(p);
                            fetchTransactions(p);
                          }}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            txPagination.page >= txPagination.totalPages
                          }
                          onClick={() => {
                            const p = txPage + 1;
                            setTxPage(p);
                            fetchTransactions(p);
                          }}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ SUPPLIERS TAB ═══════ */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Suppliers</CardTitle>
                <Button onClick={openAddSupplier}>Add Supplier</Button>
              </div>
            </CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No suppliers added yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((s) => (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer"
                        onClick={() => openEditSupplier(s)}
                      >
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {s.email ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {s.phone ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {s.address ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {s._count?.items ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSupplier(s.id);
                            }}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ MENU & MEALS TAB ═══════ */}
        <TabsContent value="menu">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Menu Products & Meal Variants</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage meal options for products. Products with a meal variant will show a Single/Meal choice in POS.
                  </p>
                </div>
                <Button onClick={fetchMenuProducts} variant="outline" disabled={menuLoading}>
                  {menuLoading ? "Loading..." : "Refresh"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {menuProducts.length === 0 && !menuLoading ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No products found. Products are loaded from the menu.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Single Price</TableHead>
                      <TableHead>Meal Variant</TableHead>
                      <TableHead>Meal Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-sm border-[1.5px] flex items-center justify-center ${product.isVeg ? "border-green-500" : "border-red-500"}`}>
                              <div className={`h-1.5 w-1.5 rounded-full ${product.isVeg ? "bg-green-500" : "bg-red-500"}`} />
                            </div>
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{product.category?.name || "—"}</TableCell>
                        <TableCell className="font-semibold">{formatCents(product.priceCents)}</TableCell>
                        <TableCell>
                          {product.mealProduct ? (
                            <Badge variant="default" className="bg-amber-500/15 text-amber-500 border-amber-500/20">
                              {product.mealProduct.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No meal</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {product.mealProduct ? (
                            <span className="text-amber-500">{formatCents(product.mealProduct.priceCents)}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.mealProduct ? (
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setMealTarget(product);
                                  setMealPrice((product.mealProduct!.priceCents / 100).toFixed(2));
                                  setMealDialogOpen(true);
                                  setErrorMsg("");
                                }}
                              >
                                Edit Price
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveMeal(product.id)}
                              >
                                Remove Meal
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setMealTarget(product);
                                setMealPrice(((product.priceCents + 500) / 100).toFixed(2));
                                setMealDialogOpen(true);
                                setErrorMsg("");
                              }}
                            >
                              + Add Meal
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════ MEAL DIALOG ═══════ */}
      <Dialog open={mealDialogOpen} onOpenChange={setMealDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mealTarget?.mealProduct ? "Edit Meal Price" : "Add Meal Variant"}
            </DialogTitle>
            <DialogDescription>
              {mealTarget ? (
                <>Set the meal price for <strong>{mealTarget.name}</strong>. Single price: <strong>{formatCents(mealTarget.priceCents)}</strong></>
              ) : "Configure meal variant"}
            </DialogDescription>
          </DialogHeader>
          {errorMsg && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMsg}
            </div>
          )}
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mealPrice">Meal Price ($)</Label>
              <Input
                id="mealPrice"
                type="number"
                step="0.01"
                min="0"
                value={mealPrice}
                onChange={(e) => setMealPrice(e.target.value)}
                placeholder="e.g. 32.99"
              />
              {mealTarget && mealPrice && (
                <p className="text-xs text-muted-foreground">
                  Meal surcharge: +{formatCents(Math.round(parseFloat(mealPrice) * 100) - mealTarget.priceCents)} over single price
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMealDialogOpen(false); setErrorMsg(""); }}>Cancel</Button>
            <Button onClick={handleAddMeal} disabled={submitting || !mealPrice}>
              {submitting ? "Saving..." : mealTarget?.mealProduct ? "Update Price" : "Create Meal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ ITEM DIALOG ═══════ */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Inventory Item" : "Add Inventory Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the details for this inventory item."
                : "Fill in the details to add a new inventory item."}
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {errorMsg}
            </p>
          )}

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="item-name">Name *</Label>
              <Input
                id="item-name"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm({ ...itemForm, name: e.target.value })
                }
                placeholder="e.g. Tomatoes"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="item-sku">SKU</Label>
                <Input
                  id="item-sku"
                  value={itemForm.sku}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, sku: e.target.value })
                  }
                  placeholder="e.g. TOM-001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="item-unit">Unit</Label>
                <Select
                  value={itemForm.unit}
                  onValueChange={(v) =>
                    setItemForm({ ...itemForm, unit: v })
                  }
                >
                  <SelectTrigger id="item-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">pcs</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="l">l</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="oz">oz</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="box">box</SelectItem>
                    <SelectItem value="case">case</SelectItem>
                    <SelectItem value="bag">bag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="item-qty">
                  {editingItem ? "Current Quantity" : "Initial Quantity"}
                </Label>
                <Input
                  id="item-qty"
                  type="number"
                  min="0"
                  step="any"
                  value={itemForm.quantity}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="item-reorder">Reorder Level</Label>
                <Input
                  id="item-reorder"
                  type="number"
                  min="0"
                  step="any"
                  value={itemForm.reorderLevel}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      reorderLevel: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="item-cost">Cost per Unit (cents)</Label>
                <Input
                  id="item-cost"
                  type="number"
                  min="0"
                  value={itemForm.costPerUnit}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      costPerUnit: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="item-supplier">Supplier</Label>
                <Select
                  value={itemForm.supplierId}
                  onValueChange={(v) =>
                    setItemForm({
                      ...itemForm,
                      supplierId: v === "__none__" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger id="item-supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setItemDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveItem} disabled={submitting || !itemForm.name}>
              {submitting ? "Saving..." : editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ TRANSACTION DIALOG ═══════ */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Record an inventory transaction to update stock levels.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {errorMsg}
            </p>
          )}

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="tx-item">Item *</Label>
              <Select
                value={txForm.inventoryItemId}
                onValueChange={(v) =>
                  setTxForm({ ...txForm, inventoryItemId: v })
                }
              >
                <SelectTrigger id="tx-item">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tx-type">Type *</Label>
                <Select
                  value={txForm.type}
                  onValueChange={(v) => setTxForm({ ...txForm, type: v })}
                >
                  <SelectTrigger id="tx-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PURCHASE">Purchase (adds stock)</SelectItem>
                    <SelectItem value="RETURN">Return (adds stock)</SelectItem>
                    <SelectItem value="USAGE">Usage (removes stock)</SelectItem>
                    <SelectItem value="WASTE">Waste (removes stock)</SelectItem>
                    <SelectItem value="ADJUSTMENT">Adjustment (sets absolute)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tx-qty">Quantity *</Label>
                <Input
                  id="tx-qty"
                  type="number"
                  min="0"
                  step="any"
                  value={txForm.quantity}
                  onChange={(e) =>
                    setTxForm({
                      ...txForm,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tx-notes">Notes</Label>
              <Textarea
                id="tx-notes"
                value={txForm.notes}
                onChange={(e) =>
                  setTxForm({ ...txForm, notes: e.target.value })
                }
                placeholder="Optional notes about this transaction"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTransaction}
              disabled={
                submitting || !txForm.inventoryItemId || txForm.quantity <= 0
              }
            >
              {submitting ? "Saving..." : "Record Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ SUPPLIER DIALOG ═══════ */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? "Update the supplier details."
                : "Fill in the details to add a new supplier."}
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {errorMsg}
            </p>
          )}

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="supplier-name">Name *</Label>
              <Input
                id="supplier-name"
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, name: e.target.value })
                }
                placeholder="e.g. Fresh Farms Co."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="supplier-email">Email</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      email: e.target.value,
                    })
                  }
                  placeholder="contact@supplier.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier-phone">Phone</Label>
                <Input
                  id="supplier-phone"
                  value={supplierForm.phone}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      phone: e.target.value,
                    })
                  }
                  placeholder="+1 555-0123"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplier-address">Address</Label>
              <Textarea
                id="supplier-address"
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm({
                    ...supplierForm,
                    address: e.target.value,
                  })
                }
                placeholder="123 Supply St, City, State"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSupplierDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSupplier}
              disabled={submitting || !supplierForm.name}
            >
              {submitting
                ? "Saving..."
                : editingSupplier
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
