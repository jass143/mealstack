import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withBrandOwner, success, error } from "@/lib/api-helpers";

// PATCH /api/brand/commission/[id] — mark as paid (or revert to pending)
// Body: { status: "PAID" | "PENDING", paidRef?: string }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withBrandOwner(async ({ brandId }) => {
    const body = await req.json().catch(() => null);
    if (!body) return error("Invalid JSON body");

    const status: "PAID" | "PENDING" | undefined = body.status;
    if (status !== "PAID" && status !== "PENDING") {
      return error("status must be PAID or PENDING");
    }
    const paidRef: string | null = typeof body.paidRef === "string" ? body.paidRef.trim() : null;

    // Make sure the entry actually belongs to this brand owner's brand.
    const entry = await prisma.commissionLedger.findUnique({ where: { id: params.id } });
    if (!entry) return error("Ledger entry not found", 404);
    if (entry.brandId !== brandId) return error("Forbidden", 403);

    const updated = await prisma.commissionLedger.update({
      where: { id: params.id },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : null,
        paidRef: status === "PAID" ? paidRef : null,
      },
    });

    return success(updated);
  });
}
