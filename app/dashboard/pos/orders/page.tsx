"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCents, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CreditCard, Eye } from "lucide-react";

type OrderItem = {
  id: string;
  productName: string;
  qty: number;
  unitPrice: number;
  notes: string | null;
};

type Order = {
  id: string;
  orderNumber: number;
  orderType: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  paymentMethod: string | null;
  paymentStatus: string;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
  table: { id: string; number: number } | null;
  customer: { id: string; name: string; phone: string | null } | null;
  createdBy: { id: string; name: string } | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-300",
  PREPARING: "bg-orange-100 text-orange-800 border-orange-300",
  READY: "bg-emerald-100 text-emerald-800 border-emerald-300",
  SERVED: "bg-teal-100 text-teal-800 border-teal-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

const STATUS_TABS = ["ALL", "PENDING", "PREPARING", "READY", "COMPLETED"] as const;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [activeStatus, setActiveStatus] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // Detail dialog
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Payment dialog
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [discountCents, setDiscountCents] = useState<string>("0");
  const [processing, setProcessing] = useState(false);

  const { toast } = useToast();

  const fetchOrders = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });
        if (activeStatus !== "ALL") {
          params.set("status", activeStatus);
        }

        const res = await fetch(`/api/pos/orders?${params}`);
        if (!res.ok) throw new Error("Failed to fetch orders");

        const data = await res.json();
        setOrders(data.orders || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      } catch {
        toast({
          title: "Error",
          description: "Failed to load orders.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [activeStatus, toast]
  );

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  const handleOpenPayment = (order: Order) => {
    setPaymentOrder(order);
    setPaymentMethod("CASH");
    setDiscountCents("0");
    setPaymentOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!paymentOrder) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/pos/orders/${paymentOrder.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: paymentOrder.id,
          paymentMethod,
          discountCents: parseInt(discountCents, 10) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Payment failed");
      }

      toast({
        title: "Payment processed",
        description: `Order #${paymentOrder.orderNumber} has been paid.`,
      });
      setPaymentOpen(false);
      fetchOrders(pagination.page);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Payment failed",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
      </div>

      {/* Status filter tabs */}
      <Tabs value={activeStatus} onValueChange={setActiveStatus}>
        <TabsList>
          {STATUS_TABS.map((status) => (
            <TabsTrigger key={status} value={status}>
              {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Orders table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          No orders found
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() => handleViewOrder(order)}
                  >
                    <TableCell className="font-medium">
                      #{order.orderNumber}
                    </TableCell>
                    <TableCell>
                      {ORDER_TYPE_LABELS[order.orderType] || order.orderType}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[order.status] || ""}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {order.items.reduce((sum, i) => sum + i.qty, 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCents(order.totalCents)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.paymentStatus === "PAID" ? "default" : "secondary"}
                      >
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {order.paymentStatus !== "PAID" &&
                          order.status !== "CANCELLED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenPayment(order)}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} orders
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchOrders(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchOrders(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Order detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Order #{selectedOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder && formatDateTime(selectedOrder.createdAt)} &middot;{" "}
              {selectedOrder &&
                (ORDER_TYPE_LABELS[selectedOrder.orderType] || selectedOrder.orderType)}
              {selectedOrder?.table && ` - Table ${selectedOrder.table.number}`}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className={STATUS_COLORS[selectedOrder.status] || ""}
                >
                  {selectedOrder.status}
                </Badge>
                <Badge
                  variant={selectedOrder.paymentStatus === "PAID" ? "default" : "secondary"}
                >
                  {selectedOrder.paymentStatus}
                </Badge>
                {selectedOrder.paymentMethod && (
                  <Badge variant="outline">{selectedOrder.paymentMethod}</Badge>
                )}
              </div>

              {selectedOrder.customer && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Customer: </span>
                  {selectedOrder.customer.name}
                  {selectedOrder.customer.phone && ` (${selectedOrder.customer.phone})`}
                </div>
              )}

              {/* Items list */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{item.productName}</span>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.qty}</TableCell>
                        <TableCell className="text-right">
                          {formatCents(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCents(item.unitPrice * item.qty)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCents(selectedOrder.subtotalCents)}</span>
                </div>
                {selectedOrder.discountCents > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCents(selectedOrder.discountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCents(selectedOrder.taxCents)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Total</span>
                  <span>{formatCents(selectedOrder.totalCents)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes: </span>
                  {selectedOrder.notes}
                </div>
              )}

              {selectedOrder.createdBy && (
                <div className="text-xs text-muted-foreground">
                  Created by {selectedOrder.createdBy.name}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedOrder &&
              selectedOrder.paymentStatus !== "PAID" &&
              selectedOrder.status !== "CANCELLED" && (
                <Button
                  onClick={() => {
                    setDetailOpen(false);
                    handleOpenPayment(selectedOrder);
                  }}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Process Payment
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Process Payment - Order #{paymentOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Total: {paymentOrder && formatCents(paymentOrder.totalCents)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Discount (in cents)</Label>
              <Input
                type="number"
                min="0"
                value={discountCents}
                onChange={(e) => setDiscountCents(e.target.value)}
                placeholder="0"
              />
              {parseInt(discountCents, 10) > 0 && paymentOrder && (
                <p className="text-sm text-muted-foreground">
                  New total:{" "}
                  {formatCents(
                    Math.max(0, paymentOrder.totalCents - parseInt(discountCents, 10))
                  )}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessPayment} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
