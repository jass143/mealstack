"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChefHat,
  Package,
  Users,
  BarChart3,
  UserCircle,
  ArrowRight,
  Zap,
  Shield,
  Globe,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning POS",
    desc: "Sub-second billing with tap-to-add menu items, GST calculation, and multi-payment support.",
    color: "from-orange-500 to-amber-500",
    iconBg: "bg-orange-500/10 text-orange-400",
  },
  {
    icon: ChefHat,
    title: "Kitchen Display",
    desc: "Real-time WebSocket-powered KDS with priority queuing and timer alerts.",
    color: "from-sky-500 to-blue-500",
    iconBg: "bg-sky-500/10 text-sky-400",
  },
  {
    icon: Package,
    title: "Inventory Control",
    desc: "Track stock levels, manage suppliers, auto-deduct on orders, low-stock alerts.",
    color: "from-emerald-500 to-green-500",
    iconBg: "bg-emerald-500/10 text-emerald-400",
  },
  {
    icon: Users,
    title: "Staff Management",
    desc: "Role-based access, shift scheduling, and performance tracking for your team.",
    color: "from-violet-500 to-purple-500",
    iconBg: "bg-violet-500/10 text-violet-400",
  },
  {
    icon: UserCircle,
    title: "Customer CRM",
    desc: "Build loyalty with profiles, order history, visit tracking, and rewards.",
    color: "from-pink-500 to-rose-500",
    iconBg: "bg-pink-500/10 text-pink-400",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Revenue trends, top sellers, peak hours, and business insights at a glance.",
    color: "from-cyan-500 to-teal-500",
    iconBg: "bg-cyan-500/10 text-cyan-400",
  },
];

const stats = [
  { value: "99.9%", label: "Uptime" },
  { value: "<200ms", label: "Response" },
  { value: "5K+", label: "Orders/day" },
  { value: "24/7", label: "Support" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[120px] animate-glow" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[120px] animate-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/">
            <Image
              src="/images/logo-compact-dark.png"
              alt="Meal Stack"
              width={240}
              height={60}
              className="h-14 w-auto"
              priority
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative mx-auto max-w-7xl px-6 pt-24 pb-20 text-center">
        <div className="animate-slide-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400">
            <Sparkles className="h-4 w-4" />
            Built for Indian restaurants
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            Restaurant ops on
            <br />
            <span className="text-gradient from-orange-400 via-amber-400 to-orange-500">
              autopilot
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            POS, kitchen display, inventory, staff, CRM, and analytics — all in one
            platform. Multi-tenant SaaS that scales from a single outlet to a chain.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-orange-500/25 transition-all hover:shadow-2xl hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-8 py-3.5 text-base font-semibold transition-all hover:bg-accent"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card/50 p-4 text-center backdrop-blur">
              <p className="text-2xl font-extrabold text-gradient from-orange-400 to-amber-400">{s.value}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="relative mx-auto max-w-7xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Everything you need to
            <span className="text-orange-500"> run your restaurant</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Six powerful modules working together. Replace multiple tools with one unified platform.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-border bg-card/50 p-6 transition-all hover:border-orange-500/30 hover:bg-card hover:shadow-xl hover:shadow-orange-500/5 animate-slide-up"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${f.iconBg}`}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              <div className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-gradient-to-r ${f.color} opacity-0 transition-opacity group-hover:opacity-100`} />
            </div>
          ))}
        </div>
      </section>

      {/* ─── Trust bar ─── */}
      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-8 sm:grid-cols-3 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <Shield className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="font-bold">Secure Multi-Tenant</h3>
              <p className="text-sm text-muted-foreground">Complete data isolation per restaurant with row-level security.</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10">
                <Zap className="h-6 w-6 text-sky-400" />
              </div>
              <h3 className="font-bold">Real-Time Sync</h3>
              <p className="text-sm text-muted-foreground">WebSocket-powered instant updates across POS, KDS, and dashboards.</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
                <Globe className="h-6 w-6 text-violet-400" />
              </div>
              <h3 className="font-bold">Scale Anywhere</h3>
              <p className="text-sm text-muted-foreground">From single outlet to nationwide chain. Subdomain per restaurant.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Ready to streamline your restaurant?
          </h2>
          <p className="mt-4 text-muted-foreground">Start your free trial. No credit card required.</p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-10 py-4 text-lg font-bold text-white shadow-xl shadow-orange-500/25 transition-all hover:shadow-2xl hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border bg-card/30 py-8">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Image src="/images/logo-full-dark.png" alt="MealStack" width={100} height={16} className="h-4 w-auto opacity-60" />
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
          <p className="text-xs text-muted-foreground">Built with Next.js, Prisma & MySQL</p>
        </div>
      </footer>
    </div>
  );
}
