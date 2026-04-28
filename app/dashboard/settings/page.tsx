"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

const platformLabels: Record<string, string> = {
  PAYTM: "Paytm",
  GOOGLE_PAY: "Google Pay",
  PHONE_PE: "PhonePe",
};

const platformColors: Record<string, string> = {
  PAYTM: "text-blue-600",
  GOOGLE_PAY: "text-green-600",
  PHONE_PE: "text-purple-600",
};

const platformExamples: Record<string, string> = {
  PAYTM: "yourshop@paytm",
  GOOGLE_PAY: "yourshop@okicici",
  PHONE_PE: "yourshop@ybl",
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    currency: "USD",
    taxRate: "0",
    timezone: "UTC",
  });

  // ─── UPI Config State ─────────────────────────────────────────────────
  const [upiConfigs, setUpiConfigs] = useState<Record<string, { upiId: string; label: string; isActive: boolean; saved: boolean }>>({
    PAYTM: { upiId: "", label: "", isActive: false, saved: false },
    GOOGLE_PAY: { upiId: "", label: "", isActive: false, saved: false },
    PHONE_PE: { upiId: "", label: "", isActive: false, saved: false },
  });
  const [upiSaving, setUpiSaving] = useState<string | null>(null);

  const loadUpiConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/upi/config");
      if (res.ok) {
        const configs = await res.json();
        const updated = { ...upiConfigs };
        for (const c of configs) {
          updated[c.platform] = { upiId: c.upiId, label: c.label || "", isActive: c.isActive, saved: true };
        }
        setUpiConfigs(updated);
      }
    } catch {}
  }, []);

  async function saveUpiConfig(platform: string) {
    const config = upiConfigs[platform];
    if (!config.upiId.trim()) {
      toast({ title: "UPI ID is required", variant: "destructive" });
      return;
    }
    setUpiSaving(platform);
    try {
      const res = await fetch("/api/upi/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, upiId: config.upiId.trim(), label: config.label || undefined, isActive: config.isActive }),
      });
      if (res.ok) {
        setUpiConfigs((prev) => ({ ...prev, [platform]: { ...prev[platform], saved: true } }));
        toast({ title: `${platformLabels[platform]} UPI saved` });
      } else {
        toast({ title: "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error saving UPI config", variant: "destructive" });
    } finally {
      setUpiSaving(null);
    }
  }

  async function removeUpiConfig(platform: string) {
    setUpiSaving(platform);
    try {
      const res = await fetch(`/api/upi/config?platform=${platform}`, { method: "DELETE" });
      if (res.ok) {
        setUpiConfigs((prev) => ({ ...prev, [platform]: { upiId: "", label: "", isActive: false, saved: false } }));
        toast({ title: `${platformLabels[platform]} UPI removed` });
      }
    } catch {
      toast({ title: "Error removing UPI config", variant: "destructive" });
    } finally {
      setUpiSaving(null);
    }
  }

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setForm({
          name: data.name || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          currency: data.currency || "USD",
          taxRate: String(data.taxRate || 0),
          timezone: data.timezone || "UTC",
        });
      }
    } catch {}
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          taxRate: parseFloat(form.taxRate),
        }),
      });
      if (res.ok) {
        toast({ title: "Settings saved" });
      } else {
        toast({ title: "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error saving settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
    loadUpiConfigs();
  }, [loadUpiConfigs]);

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-muted-foreground mt-1">Manage your restaurant settings</p>

      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <CardTitle>Restaurant Info</CardTitle>
          <CardDescription>Update your restaurant details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Restaurant Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{session?.user?.name}</span>
          </div>
          <Separator />
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{session?.user?.email}</span>
          </div>
          <Separator />
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">{session?.user?.role}</span>
          </div>
        </CardContent>
      </Card>

      {/* UPI Payment Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>UPI Payment Settings</CardTitle>
          <CardDescription>
            Add your shop&apos;s UPI IDs for Paytm, Google Pay, and PhonePe.
            When customers pay via these QR codes, you&apos;ll get notifications here automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(["PAYTM", "GOOGLE_PAY", "PHONE_PE"] as const).map((platform) => {
            const config = upiConfigs[platform];
            return (
              <div key={platform} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${platformColors[platform]}`}>
                      {platformLabels[platform]}
                    </span>
                    {config.saved && config.isActive && (
                      <Badge variant="outline" className="text-green-600 border-green-300 text-xs">Active</Badge>
                    )}
                    {config.saved && !config.isActive && (
                      <Badge variant="outline" className="text-gray-400 border-gray-300 text-xs">Disabled</Badge>
                    )}
                  </div>
                  {config.saved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 text-xs h-7"
                      onClick={() => removeUpiConfig(platform)}
                      disabled={upiSaving === platform}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">UPI ID</Label>
                    <Input
                      placeholder={platformExamples[platform]}
                      value={config.upiId}
                      onChange={(e) =>
                        setUpiConfigs((prev) => ({
                          ...prev,
                          [platform]: { ...prev[platform], upiId: e.target.value, saved: false },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Display Name (optional)</Label>
                    <Input
                      placeholder="e.g. My Shop Paytm"
                      value={config.label}
                      onChange={(e) =>
                        setUpiConfigs((prev) => ({
                          ...prev,
                          [platform]: { ...prev[platform], label: e.target.value, saved: false },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.isActive}
                      onChange={(e) =>
                        setUpiConfigs((prev) => ({
                          ...prev,
                          [platform]: { ...prev[platform], isActive: e.target.checked, saved: false },
                        }))
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-muted-foreground">Enable notifications</span>
                  </label>
                  <Button
                    size="sm"
                    onClick={() => saveUpiConfig(platform)}
                    disabled={upiSaving === platform || (config.saved && !!config.upiId)}
                  >
                    {upiSaving === platform ? "Saving..." : config.saved ? "Saved" : "Save"}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
