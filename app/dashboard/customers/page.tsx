"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCents, formatDate, formatDateTime } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  totalVisits: number;
  totalSpent: number;
  loyaltyPoints: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  id: string;
  productName: string;
  qty: number;
  unitPrice: number;
}

interface Order {
  id: string;
  orderNumber: number;
  orderType: string;
  status: string;
  totalCents: number;
  createdAt: string;
  items: OrderItem[];
}

interface CustomerDetail extends Customer {
  recentOrders: Order[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pagination for order history in detail view
  const [orderPage, setOrderPage] = useState(0);
  const [orderTotal, setOrderTotal] = useState(0);
  const [moreOrders, setMoreOrders] = useState<Order[]>([]);

  // Add form
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchCustomers = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        sortBy,
        sortOrder,
        limit: "50",
        offset: "0",
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/customers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  }, [search, sortBy, sortOrder]);

  useEffect(() => {
    setLoading(true);
    fetchCustomers().finally(() => setLoading(false));
  }, [fetchCustomers]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function openCustomerDetail(customerId: string) {
    setDetailLoading(true);
    setDetailOpen(true);
    setEditing(false);
    setMoreOrders([]);
    setOrderPage(0);
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (res.ok) {
        const data: CustomerDetail = await res.json();
        setDetailCustomer(data);
        setEditForm({
          name: data.name,
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          notes: data.notes || "",
        });

        // Get total order count
        const ordersRes = await fetch(
          `/api/customers/${customerId}/orders?limit=1&offset=0`
        );
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrderTotal(ordersData.total);
        }
      }
    } catch (err) {
      console.error("Failed to fetch customer details:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadMoreOrders() {
    if (!detailCustomer) return;
    const nextOffset = (orderPage + 1) * 10;
    try {
      const res = await fetch(
        `/api/customers/${detailCustomer.id}/orders?limit=10&offset=${nextOffset}`
      );
      if (res.ok) {
        const data = await res.json();
        setMoreOrders((prev) => [...prev, ...data.orders]);
        setOrderPage((p) => p + 1);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ─── Actions ────────────────────────────────────────────────────────────

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, string> = { name: addForm.name };
      if (addForm.email) payload.email = addForm.email;
      if (addForm.phone) payload.phone = addForm.phone;
      if (addForm.address) payload.address = addForm.address;
      if (addForm.notes) payload.notes = addForm.notes;

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setAddOpen(false);
        setAddForm({ name: "", email: "", phone: "", address: "", notes: "" });
        await fetchCustomers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add customer");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add customer");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!detailCustomer) return;
    setSubmitting(true);
    try {
      const payload: Record<string, string | undefined> = {};
      if (editForm.name !== detailCustomer.name) payload.name = editForm.name;
      if ((editForm.email || null) !== detailCustomer.email)
        payload.email = editForm.email || undefined;
      if ((editForm.phone || null) !== detailCustomer.phone)
        payload.phone = editForm.phone || undefined;
      if ((editForm.address || null) !== detailCustomer.address)
        payload.address = editForm.address || undefined;
      if ((editForm.notes || null) !== detailCustomer.notes)
        payload.notes = editForm.notes || undefined;

      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }

      const res = await fetch(`/api/customers/${detailCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetailCustomer((prev) => (prev ? { ...prev, ...updated } : prev));
        setEditing(false);
        await fetchCustomers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update customer");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update customer");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteCustomer(customerId: string) {
    if (!confirm("Are you sure you want to delete this customer? This action cannot be undone."))
      return;
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDetailOpen(false);
        setDetailCustomer(null);
        await fetchCustomers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete customer");
      }
    } catch (err) {
      console.error(err);
    }
  }

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  // ─── Derived ────────────────────────────────────────────────────────────

  const avgOrderValue =
    detailCustomer && detailCustomer.totalVisits > 0
      ? Math.round(detailCustomer.totalSpent / detailCustomer.totalVisits)
      : 0;

  const allOrders = detailCustomer
    ? [...(detailCustomer.recentOrders || []), ...moreOrders]
    : [];

  // ─── Render ─────────────────────────────────────────────────────────────

  const sortIndicator = (field: string) =>
    sortBy === field ? (sortOrder === "asc" ? " \u2191" : " \u2193") : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage customer relationships and track loyalty
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>Add Customer</Button>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name, phone, or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">
            Sort by:
          </Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date Added</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="totalSpent">Total Spent</SelectItem>
              <SelectItem value="totalVisits">Total Visits</SelectItem>
              <SelectItem value="loyaltyPoints">Loyalty Points</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
            }
          >
            {sortOrder === "asc" ? "Asc" : "Desc"}
          </Button>
        </div>
        <span className="text-sm text-muted-foreground ml-auto">
          {total} customer{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Customer Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading customers...</div>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("name")}
                >
                  Name{sortIndicator("name")}
                </TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => toggleSort("totalVisits")}
                >
                  Visits{sortIndicator("totalVisits")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => toggleSort("totalSpent")}
                >
                  Total Spent{sortIndicator("totalSpent")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => toggleSort("loyaltyPoints")}
                >
                  Loyalty Pts{sortIndicator("loyaltyPoints")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("createdAt")}
                >
                  Added{sortIndicator("createdAt")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => openCustomerDetail(customer.id)}
                >
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.phone || "--"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.email || "--"}
                  </TableCell>
                  <TableCell className="text-right">
                    {customer.totalVisits}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCents(customer.totalSpent)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">
                      {customer.loyaltyPoints}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(customer.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {search
                      ? "No customers match your search."
                      : "No customers yet. Add your first customer to get started."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ─── Add Customer Dialog ─────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>
              Create a new customer record for your CRM.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cust-name">Name</Label>
              <Input
                id="cust-name"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Jane Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-email">Email (optional)</Label>
              <Input
                id="cust-email"
                type="email"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-phone">Phone (optional)</Label>
              <Input
                id="cust-phone"
                value={addForm.phone}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-address">Address (optional)</Label>
              <Input
                id="cust-address"
                value={addForm.address}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="123 Main St"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-notes">Notes (optional)</Label>
              <Textarea
                id="cust-notes"
                value={addForm.notes}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Allergies, preferences, etc."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding..." : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Customer Detail Dialog ──────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          {detailLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading customer details...
            </div>
          ) : detailCustomer ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {detailCustomer.name}
                </DialogTitle>
                <DialogDescription>
                  Customer since {formatDate(detailCustomer.createdAt)}
                </DialogDescription>
              </DialogHeader>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="text-sm text-muted-foreground">Visits</div>
                    <div className="text-2xl font-bold">
                      {detailCustomer.totalVisits}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="text-sm text-muted-foreground">
                      Total Spent
                    </div>
                    <div className="text-2xl font-bold">
                      {formatCents(detailCustomer.totalSpent)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="text-sm text-muted-foreground">
                      Loyalty Points
                    </div>
                    <div className="text-2xl font-bold">
                      {detailCustomer.loyaltyPoints}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="text-sm text-muted-foreground">
                      Avg Order
                    </div>
                    <div className="text-2xl font-bold">
                      {formatCents(avgOrderValue)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Customer Info / Edit */}
              {editing ? (
                <form onSubmit={handleEditCustomer} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="detail-name" className="text-xs">
                        Name
                      </Label>
                      <Input
                        id="detail-name"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            name: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="detail-email" className="text-xs">
                        Email
                      </Label>
                      <Input
                        id="detail-email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="detail-phone" className="text-xs">
                        Phone
                      </Label>
                      <Input
                        id="detail-phone"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            phone: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="detail-address" className="text-xs">
                        Address
                      </Label>
                      <Input
                        id="detail-address"
                        value={editForm.address}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            address: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="detail-notes" className="text-xs">
                      Notes
                    </Label>
                    <Textarea
                      id="detail-notes"
                      value={editForm.notes}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, notes: e.target.value }))
                      }
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={submitting}>
                      {submitting ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Contact Information</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(true)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          handleDeleteCustomer(detailCustomer.id)
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      {detailCustomer.email || "--"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone: </span>
                      {detailCustomer.phone || "--"}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Address: </span>
                      {detailCustomer.address || "--"}
                    </div>
                    {detailCustomer.notes && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Notes: </span>
                        {detailCustomer.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Order History */}
              <div>
                <h3 className="font-semibold mb-3">
                  Order History ({orderTotal})
                </h3>
                {allOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No orders yet.
                  </p>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead className="text-right">
                              Total
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-mono">
                                #{order.orderNumber}
                              </TableCell>
                              <TableCell>
                                {formatDateTime(order.createdAt)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {order.orderType.replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    order.status === "COMPLETED"
                                      ? "default"
                                      : order.status === "CANCELLED"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {order.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {order.items
                                  .map((i) => `${i.qty}x ${i.productName}`)
                                  .join(", ")}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCents(order.totalCents)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {allOrders.length < orderTotal && (
                      <div className="mt-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadMoreOrders}
                        >
                          Load More Orders
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Customer not found.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
