import type { SupportTicket } from "@prisma/client";

const CONTACT_TO = "support@drivadocs.com";

export async function forwardContactMessage(ticket: SupportTicket) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`Contact message ${ticket.ticketNo} queued for ${CONTACT_TO}. Configure RESEND_API_KEY to send email.`);
    return { sent: false, reason: "RESEND_API_KEY is not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL || "DrivaDocs <support@drivadocs.com>",
      to: CONTACT_TO,
      reply_to: ticket.email,
      subject: `DrivaDocs contact: ${ticket.subject}`,
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
