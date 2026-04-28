import { NextRequest, NextResponse } from "next/server";
import { processUpiCallback } from "@/lib/upi-helpers";

// ─── PhonePe Business Webhook ──────────────────────────────────────────────
// PhonePe sends payment notifications when a customer pays via the vendor's
// PhonePe QR code / UPI ID.
//
// PhonePe callback payload reference:
//   - merchantId: Merchant ID
//   - merchantTransactionId: Merchant's transaction reference
//   - transactionId: PhonePe transaction ID
//   - amount: Amount in paise (integer)
//   - state: "COMPLETED" | "FAILED" | "PENDING"
//   - paymentInstrument.upi.utr: UPI transaction reference
//   - paymentInstrument.upi.vpa: Payer VPA
//
// Docs: https://developer.phonepe.com/docs/server-to-server-callback
// ────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // PhonePe wraps the payload in a `response` or sends it flat
    const payload = body.response || body.data || body;

    const txnId =
      payload.transactionId ||
      payload.paymentInstrument?.upi?.utr ||
      payload.utr;
    const amount = payload.amount; // PhonePe sends amount in paise
    const state = payload.state || payload.code;
    const merchantTxnId = payload.merchantTransactionId;
    const merchantUpiId =
      payload.merchantUpiId || payload.payeeVpa || payload.merchantVpa;
    const payerVpa =
      payload.paymentInstrument?.upi?.vpa ||
      payload.senderUpiId ||
      payload.payerVpa;
    const payerName = payload.payerName || payload.senderName;

    if (!txnId || amount === undefined || !merchantUpiId) {
      return NextResponse.json(
        { error: "Missing required fields: transactionId, amount, merchantUpiId" },
        { status: 400 }
      );
    }

    // Normalize status
    let normalizedStatus = "PENDING";
    if (state === "COMPLETED" || state === "SUCCESS" || state === "PAYMENT_SUCCESS") {
      normalizedStatus = "SUCCESS";
    } else if (state === "FAILED" || state === "PAYMENT_ERROR" || state === "PAYMENT_DECLINED") {
      normalizedStatus = "FAILED";
    }

    // PhonePe sends amount in paise already
    const amountPaise = typeof amount === "number" ? amount : Math.round(parseFloat(amount) * 100);

    const result = await processUpiCallback({
      platform: "PHONE_PE",
      transactionId: txnId,
      merchantUpiId,
      senderName: payerName || undefined,
      senderUpiId: payerVpa || undefined,
      amountPaise,
      status: normalizedStatus,
      merchantOrderId: merchantTxnId || undefined,
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
    console.error("[PhonePe Webhook Error]", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
