import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const secret = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_WEBHOOK_SECRET;

  if (secret) {
    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  if (event.event === "charge.success") {
    const reference = event.data?.reference;
    if (!reference) return NextResponse.json({ received: true });

    const existingPayment = await prisma.payment.findUnique({
      where: { providerReference: reference }
    });
    if (!existingPayment) return NextResponse.json({ received: true });

    const payment = existingPayment.status === "SUCCESS"
      ? existingPayment
      : await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: "SUCCESS",
            paidAt: new Date(),
            receiptNo: `RCT-${reference}`,
            metadata: event.data as never
          }
        });

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: payment.serviceRequestId },
      include: { payments: true }
    });
    const paidAmount = serviceRequest?.payments
      .filter((item) => item.status === "SUCCESS")
      .reduce((sum, item) => sum + item.amount, 0) ?? payment.amount;
    const fullyPaid = serviceRequest ? paidAmount >= serviceRequest.totalAmount : true;

    await prisma.serviceRequest.update({
      where: { id: payment.serviceRequestId },
      data: { status: fullyPaid ? "PAYMENT_CONFIRMED" : "AWAITING_PAYMENT" }
    });
  }

  return NextResponse.json({ received: true });
}
