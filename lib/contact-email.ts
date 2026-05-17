import type { SupportTicket } from "@prisma/client";
import { createBrandedEmail, getEmailFrom } from "@/lib/email-template";
import { sendMail } from "@/lib/mailer";

const CONTACT_TO = "support@drivadocs.com";

export async function forwardContactMessage(ticket: SupportTicket) {
  const email = createBrandedEmail({
    title: "New support message",
    preview: `${ticket.name} sent a support message to DrivaDocs.`,
    greeting: "Hello DrivaDocs Support",
    intro: "A customer submitted a new support message from the contact page.",
    sections: [
      {
        title: "Ticket details",
        rows: [
          { label: "Ticket", value: ticket.ticketNo },
          { label: "Name", value: ticket.name },
          { label: "Email", value: ticket.email },
          { label: "Phone", value: ticket.phone || "Not provided" },
          { label: "Subject", value: ticket.subject }
        ]
      },
      {
        title: "Message",
        rows: [{ label: "Content", value: ticket.message }]
      }
    ],
    footerNote: "Reply from the DrivaDocs admin support inbox so the conversation stays attached to the ticket."
  });

  const delivery = await sendMail({
    from: getEmailFrom(),
    to: CONTACT_TO,
    replyTo: ticket.email,
    subject: `DrivaDocs contact: ${ticket.subject}`,
    html: email.html,
    text: [
        `Ticket: ${ticket.ticketNo}`,
        `Name: ${ticket.name}`,
        `Email: ${ticket.email}`,
        `Phone: ${ticket.phone || "Not provided"}`,
        "",
        ticket.message
      ].join("\n")
  });

  if (!delivery.sent) {
    console.info(`Contact message ${ticket.ticketNo} queued for ${CONTACT_TO}. ${delivery.reason}`);
  }

  return delivery;
}
