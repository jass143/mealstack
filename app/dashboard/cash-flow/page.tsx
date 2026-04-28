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
import { DollarSign, TrendingUp, TrendingDown, ArrowDownToLine } from "lucide-react";

type Transaction = {
  id: string;
  type: string;
  amountCents: number;
  description: string;
  category: string | null;
  createdAt: string;
  createdBy: { name: string };
};

const TYPE_STYLES: Record<string, { label: string; color: string; badge: string }> = {
  EXPENSE: { label: "Expense", color: "text-red-500", badge: "bg-red-100 text-red-800" },
  WITHDRAWAL: { label: "Withdrawal", color: "text-orange-500", badge: "bg-orange-100 text-orange-800" },
  TOP_UP: { label: "Top-Up", color: "text-green-500", badge: "bg-green-100 text-green-800" },
};

export default function CashFlowPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/cash-transactions");
      if (res.ok) setTransactions(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalExpenses = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amountCents, 0);
  const totalWithdrawals = transactions.filter((t) => t.type === "WITHDRAWAL").reduce((s, t) => s + t.amountCents, 0);
  const totalTopUps = transactions.filter((t) => t.type === "TOP_UP").reduce((s, t) => s + t.amountCents, 0);
  const netCashFlow = totalTopUps - totalExpenses - totalWithdrawals;

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" /> Cash Flow
        </h1>
        <p className="text-sm text-muted-foreground">Overview of all cash movements</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-green-500/30">
          <CardContent className="py-4 text-center">
            <ArrowDownToLine className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold text-green-500">{formatCents(totalTopUps)}</p>
            <p className="text-xs text-muted-foreground">Top-Ups</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardContent className="py-4 text-center">
            <TrendingDown className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold text-red-500">{formatCents(totalExpenses)}</p>
            <p className="text-xs text-muted-foreground">Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold">{formatCents(totalWithdrawals)}</p>
            <p className="text-xs text-muted-foreground">Withdrawals</p>
          </CardContent>
        </Card>
        <Card className={netCashFlow >= 0 ? "border-green-500/30" : "border-red-500/30"}>
          <CardContent className="py-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1" />
            <p className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-green-500" : "text-red-500"}`}>
              {netCashFlow >= 0 ? "" : "-"}{formatCents(Math.abs(netCashFlow))}
            </p>
            <p className="text-xs text-muted-foreground">Net Cash Flow</p>
          </CardContent>
        </Card>
      </div>

      {/* All Transactions */}
      <Card>
        <CardHeader><CardTitle>All Transactions</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No cash transactions yet. Record expenses, withdrawals, or top-ups from the Operations page.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => {
                  const style = TYPE_STYLES[t.type] || TYPE_STYLES.EXPENSE;
                  return (
                    <TableRow key={t.id}>
                      <TableCell><Badge className={style.badge}>{style.label}</Badge></TableCell>
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell className="text-muted-foreground">{t.category || "—"}</TableCell>
                      <TableCell className={`text-right font-semibold ${style.color}`}>
                        {t.type === "TOP_UP" ? "+" : "-"}{formatCents(t.amountCents)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.createdBy.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDateTime(t.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
