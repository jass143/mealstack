import prisma from "@/lib/prisma";
import { UpiPlatform } from "@prisma/client";

// ─── UPI Webhook Helper ────────────────────────────────────────────────────
// Processes incoming UPI payment notifications from Paytm / PhonePe / GPay.
// 1. Finds the tenant by their registered UPI ID for that platform
// 2. Records the payment in `upi_payments`
// 3. Creates an in-app notification so the vendor sees it instantly
// ────────────────────────────────────────────────────────────────────────────

export type UpiCallbackData = {
  platform: UpiPlatform;
  transactionId: string;
  merchantUpiId: string; // the vendor's UPI ID that received payment
  senderName?: string;
  senderUpiId?: string;
  amountPaise: number; // amount in paise (Indian cents)
  status: string; // SUCCESS, FAILED, PENDING
  merchantOrderId?: string;
  rawPayload: string;
};

export async function processUpiCallback(data: UpiCallbackData) {
  // Find which tenant owns this UPI ID
  const config = await prisma.upiConfig.findFirst({
    where: {
      upiId: data.merchantUpiId,
      platform: data.platform,
      isActive: true,
    },
  });

  if (!config) {
    console.warn(
      `[UPI] No tenant found for UPI ID: ${data.merchantUpiId} (${data.platform})`
    );
    return { matched: false };
  }

  const tenantId = config.tenantId;

  // Check for duplicate transaction
  const existing = await prisma.upiPayment.findUnique({
    where: {
      tenantId_transactionId: { tenantId, transactionId: data.transactionId },
    },
  });

  if (existing) {
    return { matched: true, duplicate: true, paymentId: existing.id };
  }

  // Record the payment
  const payment = await prisma.upiPayment.create({
    data: {
      tenantId,
      platform: data.platform,
      transactionId: data.transactionId,
      senderName: data.senderName || null,
      senderUpiId: data.senderUpiId || null,
      amountCents: data.amountPaise, // storing paise as cents
      status: data.status,
      merchantOrderId: data.merchantOrderId || null,
      rawPayload: data.rawPayload,
    },
  });

  // Create notification for the vendor
  if (data.status === "SUCCESS") {
    const amountRupees = (data.amountPaise / 100).toFixed(2);
    const senderInfo = data.senderName || data.senderUpiId || "Customer";
    const platformLabel =
      data.platform === "GOOGLE_PAY"
        ? "Google Pay"
        : data.platform === "PHONE_PE"
          ? "PhonePe"
          : "Paytm";

    await prisma.notification.create({
      data: {
        tenantId,
        title: `₹${amountRupees} received via ${platformLabel}`,
        message: `Payment of ₹${amountRupees} received from ${senderInfo} via ${platformLabel}. Transaction ID: ${data.transactionId}`,
      },
    });
  }

  return { matched: true, duplicate: false, paymentId: payment.id };
}
