"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ShoppingCart,
  DollarSign,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ChefHat,
  Package,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

type DashboardStats = {
  todaysOrders: number;
  todaysRevenue: number;
  activeOrders: number;
  lowStockItems: number;
  revenueByDay: { date: string; revenue: number }[];
};

type RecentOrder = {
  id: string;
  orderNumber: number;
  orderType: string;
  status: string;
  totalCents: number;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20",
  CONFIRMED: "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/20",
  PREPARING: "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20",
  READY: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20",
  SERVED: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20",
  COMPLETED: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20",
  CANCELLED: "bg-red-500/15 text-red-400 ring-1 ring-red-500/20",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

export default function DashboardPage() {
  useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    fetch("/api/reports/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoadingStats(false));

    fetch("/api/pos/orders?limit=5")
      .then((r) => r.json())
      .then((data) => {
        const orders = Array.isArray(data) ? data : data.orders ?? [];
        setRecentOrders(orders.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoadingOrders(false));
  }, []);

  const chartData =
    stats?.revenueByDay.map((d) => ({
      date: d.date.slice(5),
      revenue: d.revenue,
    })) ?? [];

  const statCards = [
    {
      label: "Today's Orders",
      value: stats?.todaysOrders ?? 0,
      format: "number",
      icon: ShoppingCart,
      color: "from-orange-500 to-amber-500",
      iconBg: "bg-orange-500/15 text-orange-400",
      trend: "+12%",
      trendUp: true,
    },
    {
      label: "Today's Revenue",
      value: stats?.todaysRevenue ?? 0,
      format: "cents",
      icon: DollarSign,
      color: "from-emerald-500 to-green-500",
      iconBg: "bg-emerald-500/15 text-emerald-400",
      trend: "+8%",
      trendUp: true,
    },
    {
      label: "Active Orders",
      value: stats?.activeOrders ?? 0,
      format: "number",
      icon: Clock,
      color: "from-sky-500 to-blue-500",
      iconBg: "bg-sky-500/15 text-sky-400",
      trend: "Live",
      trendUp: true,
    },
    {
      label: "Low Stock",
      value: stats?.lowStockItems ?? 0,
      format: "number",
      icon: AlertTriangle,
      color: "from-red-500 to-rose-500",
      iconBg: "bg-red-500/15 text-red-400",
      trend: "Alert",
      trendUp: false,
    },
  ];

  return (
    <div className="space-y-6 p-5 sm:p-6">
      {/* ─── Stat Cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loadingStats
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))
          : statCards.map((card) => (
              <div
                key={card.label}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/5"
              >
                {/* Gradient accent line */}
                <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", card.color)} />

                <div className="flex items-start justify-between">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", card.iconBg)}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                    card.trendUp
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  )}>
                    {card.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {card.trend}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-2xl font-extrabold tracking-tight">
                    {card.format === "cents" ? formatCents(card.value) : card.value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.label}</p>
                </div>
              </div>
            ))}
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "New Order", href: "/pos", icon: ShoppingCart, color: "from-orange-500 to-amber-500" },
          { label: "View Kitchen", href: "/dashboard/kds", icon: ChefHat, color: "from-sky-500 to-blue-500" },
          { label: "Check Stock", href: "/dashboard/inventory", icon: Package, color: "from-emerald-500 to-green-500" },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/5"
          >
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", action.color)}>
              <action.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold">{action.label}</span>
            <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ─── Revenue Chart ─── */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-bold">Revenue Trend</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="font-semibold">Trending up</span>
            </div>
          </div>
          <div className="p-4">
            {loadingStats ? (
              <Skeleton className="h-[220px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(223, 30%, 14%)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(218, 11%, 55%)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`}
                    tick={{ fill: "hsl(218, 11%, 55%)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(224, 47%, 7%)",
                      border: "1px solid hsl(223, 30%, 14%)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "hsl(213, 31%, 91%)",
                    }}
                    formatter={(value: number) => [formatCents(value), "Revenue"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(24, 95%, 53%)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "hsl(24, 95%, 53%)", stroke: "hsl(224, 47%, 7%)", strokeWidth: 2 }}
                    fill="url(#revenueGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ─── Recent Orders ─── */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold">Recent Orders</h2>
            <Link
              href="/dashboard/pos/orders"
              className="text-xs text-orange-400 font-semibold hover:text-orange-300 transition-colors flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loadingOrders ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))
            ) : recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">No orders yet</p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 text-xs font-extrabold">
                    #{order.orderNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">
                        {ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}
                      </span>
                      <span className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                        STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"
                      )}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm font-bold">{formatCents(order.totalCents)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
