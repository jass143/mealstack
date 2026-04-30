import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30) || "restaurant";
}

async function generateUniqueDomain(restaurantName: string): Promise<string> {
  const base = slugify(restaurantName);
  let candidate = base;
  let attempt = 0;
  // Loop until we find a free slug. Cap at 50 to avoid runaway.
  while (attempt < 50) {
    const existing = await prisma.tenant.findUnique({ where: { domain: candidate } });
    if (!existing) return candidate;
    attempt++;
    candidate = `${base}-${attempt + 1}`;
  }
  // Fall back to random suffix if 50 collisions in a row (vanishingly unlikely)
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantName, email, password } = body;

    if (!restaurantName || !email || !password) {
      return NextResponse.json(
        { error: "Restaurant name, email and password are all required." },
        { status: 400 }
      );
    }

    if (typeof restaurantName !== "string" || restaurantName.trim().length < 2) {
      return NextResponse.json(
        { error: "Restaurant name must be at least 2 characters." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Globally unique email — fail early with a friendly message
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const domain = await generateUniqueDomain(restaurantName);
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: restaurantName.trim(),
          domain,
          email,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          // Use the restaurant name as the owner's display name. Vendors can
          // edit their own profile later.
          name: restaurantName.trim(),
          hashedPassword,
          role: "VENDOR",
        },
      });

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      const subscription = await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: "free",
          status: "TRIAL",
          trialEndsAt,
        },
      });

      return { tenant, user, subscription };
    });

    return NextResponse.json(
      {
        message: "Registration successful",
        tenantId: result.tenant.id,
        domain: result.tenant.domain,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
