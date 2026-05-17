import type { SupportTicket } from "@prisma/client";
import { createBrandedEmail, getEmailFrom } from "@/lib/email-template";

const CONTACT_TO = "support@drivadocs.com";

export async function forwardContactMessage(ticket: SupportTicket) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`Contact message ${ticket.ticketNo} queued for ${CONTACT_TO}. Configure RESEND_API_KEY to send email.`);
    return { sent: false, reason: "RESEND_API_KEY is not configured" };
  }

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

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to: CONTACT_TO,
      reply_to: ticket.email,
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
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Unable to forward contact message: ${response.status} ${body}`);
  }

  return { sent: true };
}
