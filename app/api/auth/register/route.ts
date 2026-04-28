import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantName, domain, adminName, email, password } = body;

    if (!restaurantName || !domain || !adminName || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required: restaurantName, domain, adminName, email, password" },
        { status: 400 }
      );
    }

    // Validate domain format (alphanumeric and hyphens only)
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(domain) && domain.length < 2) {
      return NextResponse.json(
        { error: "Domain must contain only lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    // Check if domain is already taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { domain },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: "This domain is already taken" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create tenant, admin user, and trial subscription in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: restaurantName,
          domain,
          email,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          name: adminName,
          hashedPassword,
          role: "ADMIN",
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
