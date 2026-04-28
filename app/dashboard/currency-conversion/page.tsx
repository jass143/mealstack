"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeftRight } from "lucide-react";

const currencies = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "\u20ac" },
  { code: "GBP", name: "British Pound", symbol: "\u00a3" },
  { code: "INR", name: "Indian Rupee", symbol: "\u20b9" },
  { code: "AED", name: "UAE Dirham", symbol: "\u062f.\u0625" },
  { code: "SAR", name: "Saudi Riyal", symbol: "\ufdfc" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "JPY", name: "Japanese Yen", symbol: "\u00a5" },
  { code: "CNY", name: "Chinese Yuan", symbol: "\u00a5" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
];

// Static rates relative to USD (for offline use)
const ratesVsUsd: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, AED: 3.67,
  SAR: 3.75, CAD: 1.36, AUD: 1.53, JPY: 151.5, CNY: 7.24,
  SGD: 1.34, MYR: 4.72,
};

export default function CurrencyConversionPage() {
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const [amount, setAmount] = useState("100");
  const [result, setResult] = useState("");
  const [tenantCurrency, setTenantCurrency] = useState("USD");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.currency) setTenantCurrency(data.currency); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const val = parseFloat(amount) || 0;
    const fromRate = ratesVsUsd[from] || 1;
    const toRate = ratesVsUsd[to] || 1;
    const converted = (val / fromRate) * toRate;
    setResult(converted.toFixed(2));
  }, [amount, from, to]);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Currency Conversion</h1>
        <p className="text-sm text-muted-foreground">
          Your restaurant currency: <strong>{tenantCurrency}</strong>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Convert
          </CardTitle>
          <CardDescription>Quick reference rates for your transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-end">
            {/* From */}
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
              />
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center pb-2">
              <button
                onClick={() => { setFrom(to); setTo(from); }}
                className="p-2 rounded-full hover:bg-accent transition-colors"
              >
                <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* To */}
            <div className="space-y-2">
              <Label>To</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={result} readOnly className="bg-accent/50 font-semibold" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Rates are approximate and for reference only. Last updated: static rates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
