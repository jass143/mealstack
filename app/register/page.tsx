"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState("");
  const [domain, setDomain] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDomainChange = (value: string) => {
    setDomain(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName, domain, adminName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    "14-day free trial",
    "No credit card required",
    "Full POS + KDS access",
    "Unlimited staff accounts",
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-orange-500 to-amber-500 p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="relative z-10">
          <Link href="/">
            <Image src="/images/logo-full-white.png" alt="Meal Stack" width={220} height={58} className="h-14 w-auto" priority />
          </Link>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold leading-tight">
            Get your restaurant
            <br />online in minutes.
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-md">
            Everything you need to run a modern restaurant — from billing to kitchen management.
          </p>
          <div className="mt-8 space-y-3">
            {perks.map((perk) => (
              <div key={perk} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-white/80 shrink-0" />
                <span className="text-sm font-medium text-white/90">{perk}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-sm text-white/60">
          &copy; {new Date().getFullYear()} MealStack. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <Image src="/images/logo-compact-dark.png" alt="Meal Stack" width={200} height={54} className="h-12 w-auto" priority />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight">Create your restaurant</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Start your 14-day free trial. No credit card needed.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="restaurantName" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Restaurant Name
              </label>
              <input
                id="restaurantName"
                type="text"
                placeholder="My Restaurant"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder:text-muted-foreground/50"
              />
            </div>
            <div>
              <label htmlFor="domain" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Subdomain
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="domain"
                  type="text"
                  placeholder="my-restaurant"
                  value={domain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  required
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder:text-muted-foreground/50"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">.mealstack.app</span>
              </div>
            </div>
            <div>
              <label htmlFor="adminName" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Your Name
              </label>
              <input
                id="adminName"
                type="text"
                placeholder="John Doe"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder:text-muted-foreground/50"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="john@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder:text-muted-foreground/50"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder:text-muted-foreground/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Restaurant
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-orange-400 hover:text-orange-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
