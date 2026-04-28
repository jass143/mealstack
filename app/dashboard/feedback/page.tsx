"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import { Plus, Star } from "lucide-react";

type Feedback = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  source: string;
  createdAt: string;
};

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ customerName: "", rating: "5", comment: "", source: "IN_STORE" });

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch("/api/feedback");
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rating: parseInt(form.rating) }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setForm({ customerName: "", rating: "5", comment: "", source: "IN_STORE" });
        fetchFeedback();
      }
    } catch {}
    setSubmitting(false);
  };

  const avgRating = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
    : "0";

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Feedback</h1>
          <p className="text-sm text-muted-foreground">Collect and review customer feedback</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Feedback
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold">{feedbacks.length}</p>
            <p className="text-sm text-muted-foreground">Total Reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-yellow-500">{avgRating}</p>
            <p className="text-sm text-muted-foreground">Avg Rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-green-500">
              {feedbacks.filter((f) => f.rating >= 4).length}
            </p>
            <p className="text-sm text-muted-foreground">Positive (4-5 stars)</p>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      {feedbacks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No feedback yet. Click "Add Feedback" to record customer reviews.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => (
            <Card key={fb.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{fb.customerName}</p>
                      <Badge variant="outline" className="text-[10px]">{fb.source}</Badge>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < fb.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                    {fb.comment && <p className="text-sm text-muted-foreground">{fb.comment}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(fb.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Customer Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Customer Name</Label>
              <Input value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} placeholder="Customer name" />
            </div>
            <div>
              <Label>Rating</Label>
              <Select value={form.rating} onValueChange={(v) => setForm((p) => ({ ...p, rating: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <SelectItem key={r} value={String(r)}>{"★".repeat(r)}{"☆".repeat(5 - r)} ({r})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_STORE">In-Store</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="PHONE">Phone</SelectItem>
                  <SelectItem value="SOCIAL">Social Media</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Comment</Label>
              <Textarea value={form.comment} onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))} placeholder="Customer feedback..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.customerName}>
              {submitting ? "Saving..." : "Save Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
