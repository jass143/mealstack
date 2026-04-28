"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents, formatDateTime } from "@/lib/utils";

type DueOrder = {
  id: string;
  orderNumber: number;
  totalCents: number;
  paymentStatus: string;
  orderType: string;
  createdAt: string;
  customer: { name: string; phone: string | null } | null;
};

export default function DuePaymentsPage() {
  const [orders, setOrders] = useState<DueOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDueOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/orders?paymentStatus=PENDING&limit=100");
      if (res.ok) {
        const data = await res.json();
        const items = data.data || data.orders || data;
        setOrders(Array.isArray(items) ? items : []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchDueOrders(); }, [fetchDueOrders]);

  const totalDue = orders.reduce((sum, o) => sum + o.totalCents, 0);

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Due Payments</h1>
          <p className="text-sm text-muted-foreground">Orders with pending payments</p>
        </div>
        <Card className="border-red-500/30">
          <CardContent className="py-3 px-5">
            <p className="text-xs text-muted-foreground">Total Due</p>
            <p className="text-2xl font-bold text-red-500">{formatCents(totalDue)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No pending payments. All orders are paid!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
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
                    <TableCell className="text-right font-semibold text-red-500">
                      {formatCents(order.totalCents)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </TableCell>
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
