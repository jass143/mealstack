import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import prisma from "./prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      tenantId: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    tenantId: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantId: { label: "Tenant ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        // SuperAdmin path — no tenant required
        if (!credentials.tenantId) {
          const superAdmin = await prisma.user.findFirst({
            where: {
              email: credentials.email,
              role: Role.SUPERADMIN,
              isActive: true,
            },
          });

          if (!superAdmin) {
            throw new Error("Invalid credentials");
          }

          const valid = await bcrypt.compare(credentials.password, superAdmin.hashedPassword);
          if (!valid) {
            throw new Error("Invalid credentials");
          }

          await prisma.user.update({
            where: { id: superAdmin.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: superAdmin.id,
            email: superAdmin.email,
            name: superAdmin.name,
            role: superAdmin.role,
            tenantId: null,
          };
        }

        // Tenant-scoped path (Vendor / Manager)
        // tenantId field can be either a domain or an actual ID
        const tenant = await prisma.tenant.findFirst({
          where: {
            OR: [
              { domain: credentials.tenantId },
              { id: credentials.tenantId },
            ],
          },
        });

        if (!tenant) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email,
            tenantId: tenant.id,
            isActive: true,
            role: { in: [Role.VENDOR, Role.MANAGER] },
          },
        });

        if (!user) {
          throw new Error("Invalid credentials");
        }

        const valid = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!valid) {
          throw new Error("Invalid credentials");
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.tenantId = token.tenantId;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
