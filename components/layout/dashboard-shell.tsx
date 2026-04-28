"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname()
  const isPOS = pathname.startsWith("/dashboard/pos")

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </div>

      {/* Floating New Order button — visible on all pages except POS */}
      {!isPOS && (
        <Link
          href="/dashboard/pos"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 hover:scale-[1.03] active:scale-[0.97] transition-all"
        >
          <Plus className="h-5 w-5" />
          New Order
        </Link>
      )}
    </div>
  )
}
