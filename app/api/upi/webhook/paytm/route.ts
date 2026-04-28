import { NextRequest, NextResponse } from "next/server";
import { processUpiCallback } from "@/lib/upi-helpers";

// ─── Paytm Business Webhook ────────────────────────────────────────────────
// Paytm sends payment notifications to this endpoint when a customer pays
// via the vendor's Paytm QR code / UPI ID.
//
// Paytm callback payload reference:
//   - MID: Merchant ID
//   - ORDERID: Merchant order ID
//   - TXNID: Paytm transaction ID
//   - TXNAMOUNT: Amount in rupees (string)
//   - STATUS: "TXN_SUCCESS" | "TXN_FAILURE" | "PENDING"
//   - RESPCODE: Response code
//   - RESPMSG: Response message
//   - PAYMENTMODE: "UPI" | "PPI" | etc.
//   - BANKTXNID: Bank transaction ID
//   - GATEWAYNAME: Gateway name
//
// Docs: https://business.paytm.com/docs/api/transaction-status-api
// ────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extract Paytm-specific fields
    const txnId = body.TXNID || body.txnId || body.transactionId;
    const amount = body.TXNAMOUNT || body.txnAmount || body.amount;
    const status = body.STATUS || body.status;
    const merchantId = body.MID || body.mid;
    const orderId = body.ORDERID || body.orderId;
    const payerUpi = body.PAYERUPI || body.payerUpi || body.senderUpiId;
    const payerName = body.PAYERNAME || body.payerName || body.senderName;

    // The merchant's UPI ID — Paytm sends this as the receiving VPA
    // If not in payload, we look up by merchant ID in the config
    const merchantUpiId = body.MERCHANTUPI || body.merchantUpiId || body.payeeVpa;

    if (!txnId || !amount || !merchantUpiId) {
      return NextResponse.json(
        { error: "Missing required fields: txnId, amount, merchantUpiId" },
        { status: 400 }
      );
    }

    // Normalize status
    let normalizedStatus = "PENDING";
    if (status === "TXN_SUCCESS" || status === "SUCCESS" || status === "success") {
      normalizedStatus = "SUCCESS";
    } else if (status === "TXN_FAILURE" || status === "FAILED" || status === "failure") {
      normalizedStatus = "FAILED";
    }

    const amountPaise = Math.round(parseFloat(amount) * 100);

    const result = await processUpiCallback({
      platform: "PAYTM",
      transactionId: txnId,
      merchantUpiId,
      senderName: payerName || undefined,
      senderUpiId: payerUpi || undefined,
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
    console.error("[Paytm Webhook Error]", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
