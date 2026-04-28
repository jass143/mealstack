import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
