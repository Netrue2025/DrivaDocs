import type { DeliveryAddress, ServiceRequest, User } from "@prisma/client";
import { createBrandedEmail, getAppUrl, getEmailFrom, getSupportEmail } from "@/lib/email-template";
import { sendMail } from "@/lib/mailer";
import { getServiceDeliveryPeriod } from "@/lib/service-delivery";
import { formatNaira } from "@/lib/utils";

type DocumentReadyRequest = ServiceRequest & {
  user: Pick<User, "name" | "email" | "phone">;
  deliveryAddress?: Pick<DeliveryAddress, "deliveryMethod" | "state" | "city" | "phone" | "addressLine"> | null;
};

export async function sendDocumentReadyEmail(request: DocumentReadyRequest) {
  const to = request.user.email;
  const deliveryNote = getServiceDeliveryPeriod(request.serviceType);
  const requestUrl = `${getAppUrl()}/dashboard/requests`;
  const email = createBrandedEmail({
    title: "Your documents are ready",
    preview: `${request.requestCode} is ready for delivery.`,
    greeting: `Hello ${request.user.name || "DrivaDocs customer"}`,
    intro: `Good news. Your documents for ${request.title} are ready for delivery.`,
    sections: [
      {
        title: "Order details",
        rows: [
          { label: "Request code", value: request.requestCode },
          { label: "Service", value: request.title },
          { label: "Total order price", value: formatNaira(request.totalAmount) },
          { label: "Status", value: "Ready for delivery" },
          { label: "Delivery time note", value: deliveryNote }
        ]
      },
      {
        title: "Delivery",
        rows: [
          { label: "Delivery option", value: request.deliveryAddress ? formatDeliveryMethod(request.deliveryAddress.deliveryMethod) : null },
          { label: "State", value: request.deliveryAddress?.state || request.state },
          { label: "City", value: request.deliveryAddress?.city },
          { label: "Phone", value: request.deliveryAddress?.phone || request.user.phone },
          { label: "Address", value: request.deliveryAddress?.addressLine }
        ]
      }
    ],
    cta: { label: "View request", href: requestUrl },
    footerNote: "Our team will proceed with the selected delivery option. Please keep your phone reachable for delivery coordination."
  });

  const delivery = await sendMail({
    from: getEmailFrom(),
    to,
    replyTo: getSupportEmail(),
    subject: `Documents ready for ${request.requestCode}`,
    html: email.html,
    text: email.text
  });
  if (!delivery.sent) {
    console.info(`Document ready email for ${request.requestCode} queued for ${to}. ${delivery.reason}`);
  }
  return delivery;
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
