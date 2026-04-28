"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { formatCents, formatDateTime } from "@/lib/utils";
import {
  Plus,
  Receipt,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Search,
  ArrowUpDown,
  Trash2,
  X,
  CalendarDays,
} from "lucide-react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";

type Transaction = {
  id: string;
  type: string;
  amountCents: number;
  description: string;
  category: string | null;
  createdAt: string;
  createdBy: { name: string };
};

const EXPENSE_CATEGORIES = [
  "Rent", "Utilities", "Salaries", "Raw Materials", "Equipment",
  "Marketing", "Maintenance", "Delivery", "Packaging", "Miscellaneous",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Rent": "bg-blue-500",
  "Utilities": "bg-yellow-500",
  "Salaries": "bg-green-500",
  "Raw Materials": "bg-orange-500",
  "Equipment": "bg-purple-500",
  "Marketing": "bg-pink-500",
  "Maintenance": "bg-cyan-500",
  "Delivery": "bg-indigo-500",
  "Packaging": "bg-teal-500",
  "Miscellaneous": "bg-gray-500",
};

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isThisWeek(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function isThisMonth(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function ExpensesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({ amount: "", description: "", category: "Miscellaneous" });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/cash-transactions?type=EXPENSE");
      if (res.ok) setTransactions(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Computed Stats ─────────────────────────────────────────────────────

  const todayTotal = useMemo(
    () => transactions.filter((t) => isToday(t.createdAt)).reduce((s, t) => s + t.amountCents, 0),
    [transactions]
  );

  const weekTotal = useMemo(
    () => transactions.filter((t) => isThisWeek(t.createdAt)).reduce((s, t) => s + t.amountCents, 0),
    [transactions]
  );

  const monthTotal = useMemo(
    () => transactions.filter((t) => isThisMonth(t.createdAt)).reduce((s, t) => s + t.amountCents, 0),
    [transactions]
  );

  const totalExpenses = useMemo(
    () => transactions.reduce((s, t) => s + t.amountCents, 0),
    [transactions]
  );

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    transactions.forEach((t) => {
      const cat = t.category || "Miscellaneous";
      if (!map[cat]) map[cat] = { total: 0, count: 0 };
      map[cat].total += t.amountCents;
      map[cat].count++;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data, percent: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [transactions, totalExpenses]);

  // Filtered & sorted
  const filtered = useMemo(() => {
    let result = [...transactions];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) => t.description.toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q) || t.createdBy.name.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      result = result.filter((t) => t.category === filterCategory);
    }

    // Period filter (quick presets)
    if (filterPeriod === "today") result = result.filter((t) => isToday(t.createdAt));
    else if (filterPeriod === "week") result = result.filter((t) => isThisWeek(t.createdAt));
    else if (filterPeriod === "month") result = result.filter((t) => isThisMonth(t.createdAt));

    // Date range filter (calendar picker)
    if (dateRange?.from) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      result = result.filter((t) => new Date(t.createdAt) >= from);
    }
    if (dateRange?.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      result = result.filter((t) => new Date(t.createdAt) <= to);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "date-asc": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "amount-desc": return b.amountCents - a.amountCents;
        case "amount-asc": return a.amountCents - b.amountCents;
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [transactions, searchQuery, filterCategory, filterPeriod, dateRange, sortBy]);

  const filteredTotal = useMemo(() => filtered.reduce((s, t) => s + t.amountCents, 0), [filtered]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const amountCents = Math.round(parseFloat(form.amount || "0") * 100);
    if (amountCents <= 0 || !form.description) {
      setErrorMsg("Amount and description are required");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/cash-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "EXPENSE", amountCents, description: form.description, category: form.category }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setForm({ amount: "", description: "", category: "Miscellaneous" });
        fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to save");
      }
    } catch { setErrorMsg("Failed to save"); }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await fetch(`/api/cash-transactions?id=${deletingId}`, { method: "DELETE" });
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchData();
    } catch {}
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-red-500" /> Expenses
          </h1>
          <p className="text-sm text-muted-foreground">Track and manage restaurant expenses</p>
        </div>
        <Button onClick={() => { setErrorMsg(""); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-2xl font-bold text-red-500">{formatCents(todayTotal)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{formatCents(weekTotal)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{formatCents(monthTotal)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">All Time</p>
                <p className="text-2xl font-bold text-red-500">{formatCents(totalExpenses)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{transactions.length} total entries</p>
          </CardContent>
        </Card>
      </div>


      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>
              Expense History
              {filtered.length !== transactions.length && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({filtered.length} of {transactions.length} shown — {formatCents(filteredTotal)})
                </span>
              )}
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            {/* Category Filter */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px] h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Period Filter */}
            <Select value={filterPeriod} onValueChange={(v) => { setFilterPeriod(v); if (v !== "all") setDateRange(undefined); }}>
              <SelectTrigger className="w-[140px] h-9">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            {/* Date Range Picker */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className={`h-9 text-xs gap-1.5 ${dateRange?.from ? "border-orange-500/50 text-orange-400" : ""}`}
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {dateRange?.from && dateRange?.to
                  ? `${dateRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${dateRange.to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                  : dateRange?.from
                  ? `From ${dateRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : "Pick Dates"}
              </Button>

              {showDatePicker && (
                <>
                  <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowDatePicker(false)} />
                  <div className="fixed z-50 bg-card border border-border rounded-xl shadow-2xl overflow-hidden" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                    {/* Quick presets sidebar + Calendar */}
                    <div className="flex">
                      {/* Presets */}
                      <div className="w-[140px] border-r border-border p-2 space-y-0.5 bg-accent/20">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 pt-1 pb-1.5">Quick Select</p>
                        {[
                          { label: "Today", fn: () => { const d = new Date(); return { from: d, to: d }; } },
                          { label: "Yesterday", fn: () => { const d = new Date(); d.setDate(d.getDate() - 1); return { from: d, to: d }; } },
                          { label: "Last 7 Days", fn: () => { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 6); return { from, to }; } },
                          { label: "Last 30 Days", fn: () => { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 29); return { from, to }; } },
                          { label: "This Month", fn: () => { const now = new Date(); return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }; } },
                          { label: "Last Month", fn: () => { const now = new Date(); return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) }; } },
                          { label: "This Year", fn: () => { const now = new Date(); return { from: new Date(now.getFullYear(), 0, 1), to: now }; } },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => { setDateRange(preset.fn()); setFilterPeriod("all"); }}
                            className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-accent hover:text-orange-400 transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Calendar */}
                      <div className="p-3">
                        <DayPicker
                          mode="range"
                          selected={dateRange}
                          onSelect={(range) => { setDateRange(range); setFilterPeriod("all"); }}
                          numberOfMonths={2}
                          showOutsideDays
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-accent/10">
                      <div className="text-xs text-muted-foreground">
                        {dateRange?.from && dateRange?.to
                          ? `${dateRange.from.toLocaleDateString()} — ${dateRange.to.toLocaleDateString()}`
                          : dateRange?.from
                          ? "Select end date..."
                          : "Click a start date"}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDateRange(undefined)}>
                          Clear
                        </Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => setShowDatePicker(false)}>
                          Apply
                        </Button>
                      </div>
                    </div>

                    {/* Close button */}
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
            {/* Clear All Filters */}
            {(searchQuery || filterCategory !== "all" || filterPeriod !== "all" || dateRange) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => { setSearchQuery(""); setFilterCategory("all"); setFilterPeriod("all"); setDateRange(undefined); }}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Clear All
              </Button>
            )}
            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[160px] h-9">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="amount-desc">Highest Amount</SelectItem>
                <SelectItem value="amount-asc">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {transactions.length === 0 ? "No expenses recorded yet. Click \"Add Expense\" to get started." : "No expenses match your filters."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t, idx) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      <p className="font-medium">{t.description}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${CATEGORY_COLORS[t.category || "Miscellaneous"] || "bg-gray-500"}`} />
                        <Badge variant="outline" className="text-xs">{t.category || "Miscellaneous"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-500">{formatCents(t.amountCents)}</TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">{t.createdBy.name}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => { setDeletingId(t.id); setDeleteDialogOpen(true); }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Record a new restaurant expense</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>How much did you spend?</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} className="pl-7 text-lg font-semibold h-12" />
              </div>
            </div>
            <div>
              <Label>What was it for?</Label>
              <Input placeholder="e.g. Vegetable purchase from supplier" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Brief note so you remember later</p>
            </div>
            <div>
              <Label>Expense Type</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Where does this money go?</p>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${CATEGORY_COLORS[c]}`} />
                        {c}
                        <span className="text-xs text-muted-foreground">
                          {c === "Rent" && "— shop/space rent"}
                          {c === "Utilities" && "— electricity, water, gas"}
                          {c === "Salaries" && "— staff wages"}
                          {c === "Raw Materials" && "— food, ingredients"}
                          {c === "Equipment" && "— kitchen tools, machines"}
                          {c === "Marketing" && "— ads, promotions"}
                          {c === "Maintenance" && "— repairs, cleaning"}
                          {c === "Delivery" && "— delivery charges"}
                          {c === "Packaging" && "— boxes, bags, containers"}
                          {c === "Miscellaneous" && "— other expenses"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Save Expense"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>Are you sure you want to delete this expense? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
