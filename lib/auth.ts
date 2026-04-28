import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
};

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export function requireRole(userRole: string, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole as Role);
}

export function isAdmin(role: string) {
  return role === Role.ADMIN;
}

export function isManager(role: string) {
  return role === Role.ADMIN || role === Role.MANAGER;
}

export function isStaff(role: string) {
  return [Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.CHEF, Role.WAITER].includes(role as Role);
}
