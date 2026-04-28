"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents, formatDateTime } from "@/lib/utils";
import { Globe, RefreshCw } from "lucide-react";

type Order = {
  id: string;
  orderNumber: number;
  orderType: string;
  status: string;
  totalCents: number;
  paymentStatus: string;
  createdAt: string;
  customer: { name: string } | null;
  items: { productName: string; qty: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-orange-100 text-orange-800",
  READY: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function OnlineOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/orders?limit=50");
      if (res.ok) {
        const data = await res.json();
        const items = data.data || data.orders || data;
        const all = Array.isArray(items) ? items : [];
        // Filter for delivery/takeaway (online-type orders)
        setOrders(all.filter((o: Order) => o.orderType === "DELIVERY" || o.orderType === "TAKEAWAY"));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const pending = orders.filter((o) => o.status === "PENDING" || o.status === "CONFIRMED");

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" /> Online Orders
          </h1>
          <p className="text-sm text-muted-foreground">Delivery and takeaway orders</p>
        </div>
        <Button variant="outline" onClick={() => { setLoading(true); fetchOrders(); }}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{pending.length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{orders.filter((o) => o.orderType === "DELIVERY").length}</p>
            <p className="text-sm text-muted-foreground">Delivery</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{orders.filter((o) => o.orderType === "TAKEAWAY").length}</p>
            <p className="text-sm text-muted-foreground">Takeaway</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Online Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No online orders yet. Delivery and takeaway orders from the POS will appear here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-semibold">#{order.orderNumber}</TableCell>
                    <TableCell>{order.customer?.name || "Walk-in"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.orderType.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {order.items?.map((i) => `${i.qty}x ${i.productName}`).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCents(order.totalCents)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
