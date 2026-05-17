import type { Payment, ServiceRequest, User, DeliveryAddress } from "@prisma/client";
import { createBrandedEmail, getAppUrl, getEmailFrom, getSupportEmail } from "@/lib/email-template";
import { sendMail } from "@/lib/mailer";
import { getServiceDeliveryPeriod } from "@/lib/service-delivery";
import { formatNaira } from "@/lib/utils";

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
  const to = request.user.email;
  const paidAmount = request.payments
    .filter((item) => item.status === "SUCCESS")
    .reduce((sum, item) => sum + item.amount, 0);
  const balanceDue = Math.max(request.totalAmount - paidAmount, 0);
  const fullyPaid = balanceDue <= 0;
  const receiptNo = payment.receiptNo || `RCT-${request.requestCode}`;
  const receiptUrl = `${getAppUrl()}/dashboard/requests/${request.id}/receipt`;
  const appliedService = getAppliedService(request.requirements, request.title);
  const deliveryNote = getServiceDeliveryPeriod(request.serviceType);
  const email = createBrandedEmail({
    title: "Payment received",
    preview: `Thank you for your payment for ${request.requestCode}.`,
    greeting: `Thank you ${request.user.name || "DrivaDocs customer"}`,
    intro: `We received your payment for ${appliedService}. Your order details are below.`,
    sections: [
      {
        title: "Payment summary",
        rows: [
          { label: "Request code", value: request.requestCode },
          { label: "Payment type", value: formatPaymentType(payment.type) },
          { label: "Amount paid now", value: formatNaira(payment.amount) },
          { label: "Total order price", value: formatNaira(request.totalAmount) },
          { label: "Total paid", value: formatNaira(paidAmount) },
          { label: "Balance due", value: formatNaira(balanceDue) },
          { label: "Payment status", value: fullyPaid ? "Fully paid" : "Part payment received" },
          { label: "Receipt number", value: receiptNo },
          { label: "Payment date", value: payment.paidAt ? payment.paidAt.toLocaleString("en-NG") : "Payment date unavailable" }
        ]
      },
      {
        title: "Order details",
        rows: [
          { label: "Service requested", value: request.title },
          { label: "Applied service", value: appliedService },
          { label: "Service state", value: request.state },
          { label: "Service location", value: request.location },
          { label: "Delivery time note", value: deliveryNote }
        ]
      },
      {
        title: "Delivery",
        rows: [
          { label: "Delivery option", value: request.deliveryAddress ? formatDeliveryMethod(request.deliveryAddress.deliveryMethod) : null },
          { label: "State", value: request.deliveryAddress?.state || request.state },
          { label: "City", value: request.deliveryAddress?.city },
          { label: "Phone", value: request.deliveryAddress?.phone },
          { label: "Address", value: request.deliveryAddress?.addressLine }
        ]
      }
    ],
    cta: { label: "View receipt", href: receiptUrl },
    footerNote: "Your request is now with the DrivaDocs team. We will keep you updated as your documents move through processing and delivery."
  });

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

  const delivery = await sendMail({
    from: getEmailFrom(),
    to,
    replyTo: getSupportEmail(),
    subject: `Payment successful for ${request.requestCode}`,
    html: email.html,
    text: email.text || lines.join("\n")
  });
  if (!delivery.sent) {
    console.info(`Payment success email for ${request.requestCode} queued for ${to}. ${delivery.reason}`);
  }
  return delivery;
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
