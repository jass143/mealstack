"use client";

import Link from "next/link";
import {
  ClipboardList,
  Globe,
  ChefHat,
  Users,
  DollarSign,
  Receipt,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  BellRing,
  Armchair,
  RefreshCw,
  HelpCircle,
  Radio,
  CreditCard,
  Languages,
  UserCog,
  ArrowLeftRight,
  MessageSquareQuote,
  Truck,
  Monitor,
  ScreenShare,
  Mail,
  Settings,
  ShieldCheck,
  FileText,
  Percent,
  ListChecks,
  Cog,
  UserCircle,
  ImageUp,
} from "lucide-react";

const operationTiles = [
  { label: "Orders", icon: ClipboardList, href: "/dashboard/pos/orders", color: "text-gray-700 dark:text-gray-300" },
  { label: "Online Orders", icon: Globe, href: "/dashboard/online-orders", color: "text-gray-700 dark:text-gray-300" },
  { label: "KOTs", icon: ChefHat, href: "/dashboard/kds", color: "text-gray-700 dark:text-gray-300" },
  { label: "Customers", icon: Users, href: "/dashboard/customers", color: "text-gray-700 dark:text-gray-300" },
  { label: "Cash Flow", icon: DollarSign, href: "/dashboard/cash-flow", color: "text-gray-700 dark:text-gray-300" },
  { label: "Expenses", icon: Receipt, href: "/dashboard/expenses", color: "text-red-500" },
  { label: "Withdrawal", icon: ArrowUpFromLine, href: "/dashboard/withdrawal", color: "text-gray-700 dark:text-gray-300" },
  { label: "Cash Top-Up", icon: ArrowDownToLine, href: "/dashboard/cash-topup", color: "text-gray-700 dark:text-gray-300" },
  { label: "Inventory", icon: Package, href: "/dashboard/inventory", color: "text-gray-700 dark:text-gray-300" },
  { label: "Alerts", icon: BellRing, href: "/dashboard/alerts", color: "text-gray-700 dark:text-gray-300" },
  { label: "Table", icon: Armchair, href: "/dashboard/tables", color: "text-gray-700 dark:text-gray-300" },
  { label: "Manual Sync", icon: RefreshCw, href: "/dashboard/manual-sync", color: "text-gray-700 dark:text-gray-300" },
  { label: "Help", icon: HelpCircle, href: "/dashboard/help", color: "text-gray-700 dark:text-gray-300" },
  { label: "Live View", icon: Radio, href: "/dashboard/kds", color: "text-gray-700 dark:text-gray-300" },
  { label: "Due Payment", icon: CreditCard, href: "/dashboard/due-payments", color: "text-gray-700 dark:text-gray-300" },
  { label: "UPI Payments", icon: CreditCard, href: "/dashboard/upi-payments", color: "text-purple-500" },
  { label: "Language Profiles", icon: Languages, href: "/dashboard/language-profiles", color: "text-gray-700 dark:text-gray-300" },
  { label: "Billing User Profile", icon: UserCog, href: "/dashboard/staff", color: "text-gray-700 dark:text-gray-300" },
  { label: "Currency Conversion", icon: ArrowLeftRight, href: "/dashboard/currency-conversion", color: "text-gray-700 dark:text-gray-300" },
  { label: "Feedback", icon: MessageSquareQuote, href: "/dashboard/feedback", color: "text-gray-700 dark:text-gray-300" },
  { label: "Delivery Boys", icon: Truck, href: "/dashboard/delivery-boys", color: "text-gray-700 dark:text-gray-300" },
  { label: "LED Display", icon: Monitor, href: "/dashboard/led-display", color: "text-gray-700 dark:text-gray-300" },
  { label: "Dual Screen", icon: ScreenShare, href: "/dashboard/dual-screen", color: "text-gray-700 dark:text-gray-300" },
];

const configTiles = [
  { label: "Menu", icon: ListChecks, href: "/dashboard/inventory", color: "text-gray-700 dark:text-gray-300" },
  { label: "Menu Import", icon: ImageUp, href: "/dashboard/menu-import", color: "text-orange-500" },
  { label: "Printer", icon: FileText, href: "/dashboard/settings", color: "text-gray-700 dark:text-gray-300" },
  { label: "Tax", icon: Percent, href: "/dashboard/settings", color: "text-gray-700 dark:text-gray-300" },
  { label: "Discounts", icon: Receipt, href: "/dashboard/settings", color: "text-gray-700 dark:text-gray-300" },
  { label: "Order Types", icon: ClipboardList, href: "/dashboard/settings", color: "text-gray-700 dark:text-gray-300" },
  { label: "General", icon: Cog, href: "/dashboard/settings", color: "text-gray-700 dark:text-gray-300" },
  { label: "Staff", icon: UserCircle, href: "/dashboard/staff", color: "text-gray-700 dark:text-gray-300" },
  { label: "Permissions", icon: ShieldCheck, href: "/dashboard/settings", color: "text-gray-700 dark:text-gray-300" },
];

export default function OperationsPage() {
  return (
    <div className="p-6 space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Version: 1.0.0</p>
        </div>
        <a
          href="mailto:support@mealstack.app"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Mail className="h-4 w-4" />
          support@mealstack.app
        </a>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
        {operationTiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center hover:border-orange-500/40 hover:shadow-md hover:shadow-orange-500/5 transition-all active:scale-[0.97]"
          >
            <tile.icon className={`h-8 w-8 ${tile.color}`} strokeWidth={1.5} />
            <span className="text-[11px] font-semibold leading-tight">{tile.label}</span>
          </Link>
        ))}
      </div>

      {/* Configuration Section */}
      <div>
        <h2 className="text-lg font-bold mb-4">Set the configuration for your restaurant</h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
          {configTiles.map((tile) => (
            <Link
              key={tile.label}
              href={tile.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center hover:border-orange-500/40 hover:shadow-md hover:shadow-orange-500/5 transition-all active:scale-[0.97]"
            >
              <tile.icon className={`h-8 w-8 ${tile.color}`} strokeWidth={1.5} />
              <span className="text-[11px] font-semibold leading-tight">{tile.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
