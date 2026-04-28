"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, Maximize2 } from "lucide-react";

type Order = {
  id: string;
  orderNumber: number;
  status: string;
  orderType: string;
};

export default function LEDDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/orders?limit=20");
      if (res.ok) {
        const data = await res.json();
        const items = data.data || data.orders || data;
        setOrders(Array.isArray(items) ? items : []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const preparing = orders.filter((o) => o.status === "PREPARING" || o.status === "CONFIRMED");
  const ready = orders.filter((o) => o.status === "READY");

  const goFullScreen = () => {
    document.documentElement.requestFullscreen?.();
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6" /> LED Display
          </h1>
          <p className="text-sm text-muted-foreground">Customer-facing order status display</p>
        </div>
        <Button variant="outline" onClick={goFullScreen}>
          <Maximize2 className="h-4 w-4 mr-2" /> Full Screen
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Preparing */}
        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-yellow-500">Preparing</CardTitle>
            <CardDescription>{preparing.length} orders in kitchen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {preparing.map((o) => (
                <div key={o.id} className="flex flex-col items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4">
                  <span className="text-3xl font-bold text-yellow-500">#{o.orderNumber}</span>
                  <Badge variant="outline" className="mt-1 text-[10px]">{o.orderType.replace("_", " ")}</Badge>
                </div>
              ))}
              {preparing.length === 0 && (
                <p className="col-span-3 text-center py-8 text-muted-foreground">No orders preparing</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ready */}
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-500">Ready for Pickup</CardTitle>
            <CardDescription>{ready.length} orders ready</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {ready.map((o) => (
                <div key={o.id} className="flex flex-col items-center justify-center rounded-xl bg-green-500/10 border border-green-500/30 p-4 animate-pulse">
                  <span className="text-3xl font-bold text-green-500">#{o.orderNumber}</span>
                  <Badge variant="outline" className="mt-1 text-[10px]">{o.orderType.replace("_", " ")}</Badge>
                </div>
              ))}
              {ready.length === 0 && (
                <p className="col-span-3 text-center py-8 text-muted-foreground">No orders ready</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
