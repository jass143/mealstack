"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents, formatDateTime } from "@/lib/utils";
import { Plus, ArrowUpFromLine } from "lucide-react";

type Transaction = {
  id: string;
  amountCents: number;
  description: string;
  createdAt: string;
  createdBy: { name: string };
};

export default function WithdrawalPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({ amount: "", description: "" });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/cash-transactions?type=WITHDRAWAL");
      if (res.ok) setTransactions(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    const amountCents = Math.round(parseFloat(form.amount || "0") * 100);
    if (amountCents <= 0 || !form.description) {
      setErrorMsg("Amount and reason are required");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/cash-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "WITHDRAWAL", amountCents, description: form.description }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setForm({ amount: "", description: "" });
        fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to save");
      }
    } catch { setErrorMsg("Failed to save"); }
    setSubmitting(false);
  };

  const totalWithdrawn = transactions.reduce((s, t) => s + t.amountCents, 0);

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowUpFromLine className="h-6 w-6" /> Cash Withdrawal
          </h1>
          <p className="text-sm text-muted-foreground">Record cash taken out of the register</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Record Withdrawal
        </Button>
      </div>

      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground">Total Withdrawn</p>
          <p className="text-3xl font-bold">{formatCents(totalWithdrawn)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Withdrawal History</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No withdrawals recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Withdrawn By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCents(t.amountCents)}</TableCell>
                    <TableCell className="text-muted-foreground">{t.createdBy.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateTime(t.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Withdrawal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Reason</Label>
              <Input placeholder="Why is this cash being withdrawn?" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
