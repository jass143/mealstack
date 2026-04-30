"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Grid3X3,
  ChefHat,
  Package,
  Users,
  UserCircle,
  BarChart3,
  Settings,
  CreditCard,
  X,
  LogOut,
  Layers,
  Building2,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/stores/use-app-store"

// `vendorOnly` items are hidden from MANAGER role (account-level controls).
// BRAND_OWNER is treated as Vendor-equivalent for their own outlet.
const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, vendorOnly: false },
  { label: "Operations", href: "/dashboard/operations", icon: Grid3X3, vendorOnly: false },
  { label: "Kitchen", href: "/dashboard/kds", icon: ChefHat, vendorOnly: false },
  { label: "Inventory", href: "/dashboard/inventory", icon: Package, vendorOnly: false },
  { label: "Staff", href: "/dashboard/staff", icon: Users, vendorOnly: true },
  { label: "Customers", href: "/dashboard/customers", icon: UserCircle, vendorOnly: false },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3, vendorOnly: false },
  { label: "Subscription", href: "/dashboard/subscription", icon: CreditCard, vendorOnly: true },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, vendorOnly: true },
] as const

// Shown only when role === BRAND_OWNER. These cross-tenant views are powered
// by /api/brand/* and bypass the per-tenant scoping the regular dashboard uses.
const brandNavItems = [
  { label: "Brand Overview", href: "/dashboard/brand", icon: Layers, exact: true },
  { label: "Outlets", href: "/dashboard/brand/outlets", icon: Building2, exact: false },
] as const

function getRoleBadge(role: string) {
  const styles: Record<string, string> = {
    superadmin: "bg-red-500/15 text-red-400 ring-1 ring-red-500/20",
    vendor: "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20",
    manager: "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/20",
  }
  return styles[role.toLowerCase()] || "bg-muted text-muted-foreground"
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { sidebarOpen, setSidebarOpen } = useAppStore()

  const userRole = (session?.user as { role?: string } | undefined)?.role ?? "staff"
  const userName = session?.user?.name ?? "User"
  const userInitial = userName.charAt(0).toUpperCase()
  const upperRole = userRole.toUpperCase()
  // BRAND_OWNER is treated as a vendor for their own outlet (full vendor nav)
  const isVendorLike = upperRole === "VENDOR" || upperRole === "BRAND_OWNER"
  const isBrandOwner = upperRole === "BRAND_OWNER"
  const visibleNavItems = navItems.filter((item) => !item.vendorOnly || isVendorLike)

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border bg-card transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-center px-5 border-b border-border relative">
          <Link
            href="/dashboard"
            className="flex items-center justify-center"
            onClick={() => setSidebarOpen(false)}
          >
            <Image
              src="/images/logo-compact-dark.png"
              alt="Meal Stack"
              width={220}
              height={55}
              className="h-12 w-auto"
              priority
            />
          </Link>
          <button
            className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5">
          {visibleNavItems.map((item) => {
            // Don't claim active state for the dashboard tab when we're inside /dashboard/brand/*
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : !pathname.startsWith("/dashboard/brand") && pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-orange-500/10 text-orange-400 shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-orange-400")} />
                {item.label}
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-500" />
                )}
              </Link>
            )
          })}

          {isBrandOwner && (
            <>
              <div className="mt-6 mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Brand
              </div>
              {brandNavItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-amber-500/10 text-amber-400 shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-amber-400")} />
                    {item.label}
                    {isActive && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500" />
                    )}
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        {/* User card */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-xl bg-accent/50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-sm font-bold text-white shadow-sm">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold">{userName}</p>
              <span className={cn(
                "inline-block mt-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                getRoleBadge(userRole)
              )}>
                {userRole}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
