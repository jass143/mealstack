import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
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

export function isSuperAdmin(role: string) {
  return role === Role.SUPERADMIN;
}

export function isVendor(role: string) {
  return role === Role.VENDOR;
}

export function isManagerOrAbove(role: string) {
  return role === Role.VENDOR || role === Role.MANAGER;
}
