"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type DashboardStats = {
  todaysOrders: number;
  todaysRevenue: number;
  activeOrders: number;
  lowStockItems: number;
  revenueByDay: { date: string; revenue: number }[];
};

type SalesReport = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  dailyRevenue: { date: string; revenue: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  ordersByType: { type: string; count: number }[];
  paymentMethods: { method: string; count: number }[];
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

function formatChartCents(value: number) {
  return `$${(value / 100).toFixed(0)}`;
}

export default function ReportsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSales, setLoadingSales] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    fetch("/api/reports/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, []);

  const fetchSales = useCallback(() => {
    if (!startDate || !endDate) return;
    setLoadingSales(true);
    fetch(`/api/reports/sales?startDate=${startDate}&endDate=${endDate}`)
      .then((r) => r.json())
      .then(setSales)
      .catch(console.error)
      .finally(() => setLoadingSales(false));
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const revenueChartData =
    stats?.revenueByDay.map((d) => ({
      date: d.date.slice(5), // MM-DD
      revenue: d.revenue,
    })) ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Track your restaurant performance and trends.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Today's Orders"
              value={String(stats?.todaysOrders ?? 0)}
            />
            <StatCard
              title="Today's Revenue"
              value={formatCents(stats?.todaysRevenue ?? 0)}
            />
            <StatCard
              title="Active Orders"
              value={String(stats?.activeOrders ?? 0)}
            />
            <StatCard
              title="Low Stock Alerts"
              value={String(stats?.lowStockItems ?? 0)}
              alert={!!stats?.lowStockItems && stats.lowStockItems > 0}
            />
          </>
        )}
      </div>

      {/* Revenue Trend (7 days) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue Trend (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={formatChartCents} />
                <Tooltip
                  formatter={(value: number) => [formatCents(value), "Revenue"]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Sales Breakdown Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-lg">Sales Breakdown</CardTitle>
              <CardDescription>Select a date range to analyze sales.</CardDescription>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <Button onClick={fetchSales} size="sm">
                Apply
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSales ? (
            <div className="space-y-4">
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : sales ? (
            <div className="space-y-8">
              {/* Summary Row */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCents(sales.totalRevenue)}</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{sales.totalOrders}</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  <p className="text-2xl font-bold">{formatCents(sales.avgOrderValue)}</p>
                </div>
              </div>

              {/* Daily Revenue Bar Chart */}
              {sales.dailyRevenue.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold">Daily Revenue</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={sales.dailyRevenue.map((d) => ({
                        ...d,
                        date: d.date.slice(5),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={formatChartCents} />
                      <Tooltip
                        formatter={(value: number) => [formatCents(value), "Revenue"]}
                      />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Orders by Type Pie Chart */}
              <div className="grid gap-6 md:grid-cols-2">
                {sales.ordersByType.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Orders by Type</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={sales.ordersByType.map((d) => ({
                            name: ORDER_TYPE_LABELS[d.type] ?? d.type,
                            value: d.count,
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {sales.ordersByType.map((_, i) => (
                            <Cell
                              key={i}
                              fill={PIE_COLORS[i % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Payment Methods Bar Chart */}
                {sales.paymentMethods.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Payment Methods</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={sales.paymentMethods}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="method" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Top Products Table */}
              {sales.topProducts.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold">Top Selling Products</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.topProducts.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{i + 1}</TableCell>
                          <TableCell>{p.name}</TableCell>
                          <TableCell className="text-right">{p.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCents(p.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              No sales data for the selected period.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  alert = false,
}: {
  title: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${alert ? "text-destructive" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
