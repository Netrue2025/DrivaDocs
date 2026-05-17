import type { Payment, ServiceRequest, User, DeliveryAddress } from "@prisma/client";
import { formatNaira } from "@/lib/utils";

const SUPPORT_EMAIL = "support@drivadocs.com";

type PaymentEmailRequest = ServiceRequest & {
  user: Pick<User, "name" | "email" | "phone">;
  payments: Pick<Payment, "amount" | "status">[];
  deliveryAddress?: Pick<DeliveryAddress, "deliveryMethod" | "state" | "city" | "phone" | "addressLine"> | null;
};

type PaymentEmailPayment = Pick<Payment, "amount" | "type" | "paidAt" | "receiptNo">;

export async function sendPaymentSuccessEmail({
  request,
  payment
}: {
  request: PaymentEmailRequest;
  payment: PaymentEmailPayment;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = request.user.email;
  const paidAmount = request.payments
    .filter((item) => item.status === "SUCCESS")
    .reduce((sum, item) => sum + item.amount, 0);
  const balanceDue = Math.max(request.totalAmount - paidAmount, 0);
  const fullyPaid = balanceDue <= 0;
  const receiptNo = payment.receiptNo || `RCT-${request.requestCode}`;
  const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/requests/${request.id}/receipt`;
  const appliedService = getAppliedService(request.requirements, request.title);

  const lines = [
    `Hello ${request.user.name || "DrivaDocs customer"},`,
    "",
    "Your payment was successful. Here are the details of the service paid for and requested:",
    "",
    `Request code: ${request.requestCode}`,
    `Service requested: ${request.title}`,
    `Applied service: ${appliedService}`,
    `Payment type: ${formatPaymentType(payment.type)}`,
    `Amount paid now: ${formatNaira(payment.amount)}`,
    `Total paid: ${formatNaira(paidAmount)}`,
    `Total service amount: ${formatNaira(request.totalAmount)}`,
    `Balance due: ${formatNaira(balanceDue)}`,
    `Payment status: ${fullyPaid ? "Fully paid" : "Part payment received"}`,
    `Receipt number: ${receiptNo}`,
    payment.paidAt ? `Payment date: ${payment.paidAt.toLocaleString("en-NG")}` : null,
    request.state ? `Service state: ${request.state}` : null,
    request.location ? `Service location: ${request.location}` : null,
    request.deliveryAddress ? `Delivery: ${formatDeliveryMethod(request.deliveryAddress.deliveryMethod)}` : null,
    request.deliveryAddress?.addressLine ? `Delivery address: ${request.deliveryAddress.addressLine}` : null,
    "",
    `View your receipt: ${receiptUrl}`,
    "",
    "Thank you for choosing DrivaDocs."
  ].filter(Boolean);

  if (!apiKey) {
    console.info(`Payment success email for ${request.requestCode} queued for ${to}. Configure RESEND_API_KEY to send email.`);
    return { sent: false, reason: "RESEND_API_KEY is not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || process.env.CONTACT_FROM_EMAIL || `DrivaDocs <${SUPPORT_EMAIL}>`,
      to,
      reply_to: SUPPORT_EMAIL,
      subject: `Payment successful for ${request.requestCode}`,
      text: lines.join("\n")
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Unable to send payment success email: ${response.status} ${body}`);
  }

  return { sent: true };
}

function getAppliedService(requirements: unknown, fallback: string) {
  if (!requirements || typeof requirements !== "object" || Array.isArray(requirements)) return fallback;
  const record = requirements as Record<string, unknown>;
  return typeof record.permitType === "string" && record.permitType.trim() ? record.permitType : fallback;
}

function formatPaymentType(type: Payment["type"]) {
  const labels: Record<Payment["type"], string> = {
    FULL: "Full payment",
    UPFRONT_75: "75% upfront payment",
    BALANCE_25: "25% balance payment"
  };
  return labels[type];
}

function formatDeliveryMethod(method?: string | null) {
  const labels: Record<string, string> = {
    PHYSICAL_DELIVERY: "Physical delivery",
    SCAN_TO_ME: "Scan to me (online)",
    PICKUP_OFFICE: "Pickup from our office",
    HOME_OFFICE: "Physical delivery"
  };
  return method ? labels[method] || formatFieldLabel(method) : "Physical delivery";
}

function formatFieldLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}
