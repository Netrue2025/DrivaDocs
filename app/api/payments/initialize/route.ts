import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { initializePaystackPayment } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import { requestCode } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const serviceRequestId = String(formData.get("serviceRequestId") || "");
  const paymentType = String(formData.get("paymentType") || "UPFRONT_75");

  if (!serviceRequestId || !["UPFRONT_75", "BALANCE_25", "FULL"].includes(paymentType)) {
    return NextResponse.json({ error: "Invalid payment request" }, { status: 400 });
  }

  const serviceRequest = await prisma.serviceRequest.findFirst({
    where: { id: serviceRequestId, userId: session.user.id },
    include: { payments: true }
  });

  if (!serviceRequest) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  const paidAmount = serviceRequest.payments
    .filter((payment) => payment.status === "SUCCESS")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = Math.max(serviceRequest.totalAmount - paidAmount, 0);
  const upfrontDue = Math.max((serviceRequest.upfrontAmount || serviceRequest.totalAmount) - paidAmount, 0);
  const amount =
    paymentType === "FULL" || paymentType === "BALANCE_25"
      ? remainingAmount
      : upfrontDue;

  if (amount <= 0) {
    return NextResponse.json({ error: "No payment balance is due for this request" }, { status: 400 });
  }

  const reference = requestCode("PAY");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const initialized = await initializePaystackPayment({
    email: session.user.email,
    amountNaira: amount,
    reference,
    callbackUrl: `${appUrl}/dashboard/requests?payment=${reference}`,
    metadata: { serviceRequestId, userId: session.user.id }
  });

  await prisma.payment.create({
    data: {
      userId: session.user.id,
      serviceRequestId,
      amount,
      type: paymentType as never,
      status: "INITIALIZED",
      providerReference: reference,
      authorizationUrl: initialized.authorizationUrl
    }
  });

  return NextResponse.redirect(new URL(initialized.authorizationUrl, request.url), 303);
}
