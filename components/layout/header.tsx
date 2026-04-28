"use client"

import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Menu, Bell, Search } from "lucide-react"
import { useAppStore } from "@/stores/use-app-store"

const pageNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/pos": "POS Terminal",
  "/dashboard/kds": "Kitchen Display",
  "/dashboard/inventory": "Inventory",
  "/dashboard/staff": "Staff Management",
  "/dashboard/customers": "Customers",
  "/dashboard/reports": "Reports & Analytics",
  "/dashboard/settings": "Settings",
  "/dashboard/subscription": "Subscription",
}

export function Header() {
  const { data: session } = useSession()
  const { toggleSidebar } = useAppStore()
  const pathname = usePathname()

  const pageName = Object.entries(pageNames).find(
    ([path]) => pathname === path || (path !== "/dashboard" && pathname.startsWith(path))
  )?.[1] ?? "Dashboard"

  const userName = session?.user?.name ?? "User"
  const greeting = getGreeting()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-xl px-4 sm:px-6">
      {/* Mobile menu toggle */}
      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title + breadcrumb */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold truncate">{pageName}</h1>
        <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
          {greeting}, {userName.split(" ")[0]}
        </p>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Search className="h-4 w-4" />
        </button>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-card" />
        </button>
      </div>
    </header>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}
