import { NextRequest, NextResponse } from "next/server";
import { processUpiCallback } from "@/lib/upi-helpers";

// ─── Google Pay Business Webhook ───────────────────────────────────────────
// Google Pay for Business sends payment notifications when a customer pays
// via the vendor's Google Pay QR code / UPI ID.
//
// Google Pay uses standard UPI callback format via the acquiring bank.
// The webhook payload varies by integration partner, but common fields:
//   - txnId / transactionId: UPI transaction reference
//   - txnRef / utr: Bank UTR number
//   - amount: Amount (may be rupees or paise depending on partner)
//   - status: "SUCCESS" | "FAILURE" | "PENDING"
//   - payerVpa: Customer's UPI ID
//   - payeeVpa: Merchant's UPI ID (Google Pay assigned)
//   - payerName: Customer's name
//
// Note: Google Pay Business webhook format depends on the bank/aggregator.
// This handler supports common formats from major acquiring banks.
// ────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payload = body.data || body.response || body;

    const txnId =
      payload.txnId ||
      payload.transactionId ||
      payload.utr ||
      payload.txnRef;
    const amount = payload.amount || payload.txnAmount;
    const status = payload.status || payload.txnStatus;
    const merchantUpiId =
      payload.payeeVpa ||
      payload.merchantUpiId ||
      payload.merchantVpa;
    const payerVpa = payload.payerVpa || payload.senderUpiId;
    const payerName = payload.payerName || payload.senderName;
    const orderId = payload.merchantOrderId || payload.orderId;

    if (!txnId || amount === undefined || !merchantUpiId) {
      return NextResponse.json(
        { error: "Missing required fields: txnId, amount, merchantUpiId" },
        { status: 400 }
      );
    }

    // Normalize status
    let normalizedStatus = "PENDING";
    if (status === "SUCCESS" || status === "success" || status === "S") {
      normalizedStatus = "SUCCESS";
    } else if (status === "FAILURE" || status === "failure" || status === "F" || status === "FAILED") {
      normalizedStatus = "FAILED";
    }

    // Amount handling: if it looks like rupees (has decimal or < 1000 and likely rupees), convert
    const amountNum = typeof amount === "number" ? amount : parseFloat(amount);
    const amountPaise = amountNum < 100000 && String(amount).includes(".")
      ? Math.round(amountNum * 100)
      : Math.round(amountNum);

    const result = await processUpiCallback({
      platform: "GOOGLE_PAY",
      transactionId: txnId,
      merchantUpiId,
      senderName: payerName || undefined,
      senderUpiId: payerVpa || undefined,
      amountPaise,
      status: normalizedStatus,
      merchantOrderId: orderId || undefined,
      rawPayload: JSON.stringify(body),
    });

    if (!result.matched) {
      return NextResponse.json(
        { error: "No matching merchant found for this UPI ID" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, paymentId: result.paymentId });
  } catch (err) {
    console.error("[GooglePay Webhook Error]", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
