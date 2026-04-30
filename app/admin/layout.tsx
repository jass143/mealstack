"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Building2, CreditCard, ShieldCheck, LogOut, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Tenants", href: "/admin/tenants", icon: Building2, exact: false },
  { label: "Brands", href: "/admin/brands", icon: Layers, exact: false },
  { label: "Payments", href: "/admin/payments", icon: CreditCard, exact: false },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The login page renders without the chrome
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/30">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">MealStack</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Platform Admin</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-orange-500/10 text-orange-400"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
