"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [domain, setDomain] = useState("demo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Pass the domain as-is — auth-options resolves it server-side.
      const result = await signIn("credentials", {
        email,
        password,
        tenantId: domain,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email, password, or restaurant domain.");
      } else {
        router.push("/dashboard/pos");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-orange-500 to-amber-500 p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="relative z-10">
          <Link href="/">
            <Image src="/images/logo-full-white.png" alt="Meal Stack" width={220} height={58} className="h-14 w-auto" priority />
          </Link>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold leading-tight">
            Manage your restaurant
            <br />like never before.
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-md">
            POS, kitchen display, inventory, and analytics — all in one platform designed for speed.
          </p>
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
            <h2 className="text-2xl font-extrabold tracking-tight">Welcome back</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to your restaurant dashboard
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="domain" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Restaurant
              </label>
              <input
                id="domain"
                type="text"
                placeholder="demo"
                value={domain}
                onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
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
                placeholder="vendor@restaurant.com"
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-orange-400 hover:text-orange-300 transition-colors">
              Register your restaurant
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
