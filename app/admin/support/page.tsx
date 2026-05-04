import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AdminShell } from "@/components/admin-shell";
import { AdminSupportInbox, type AdminSupportTicketRow } from "@/components/admin-support-inbox";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/dashboard");

  const tickets = await prisma.supportTicket.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { messages: { orderBy: { createdAt: "asc" } } }
  }).catch(() => []);

  const rows: AdminSupportTicketRow[] = tickets.map((ticket) => ({
    id: ticket.id,
    ticketNo: ticket.ticketNo,
    name: ticket.name,
    email: ticket.email,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    adminReply: ticket.adminReply,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    messages: ticket.messages.length
      ? ticket.messages.map((message) => ({
          id: message.id,
          senderRole: message.senderRole,
          message: message.message,
          readByAdmin: message.readByAdmin,
          createdAt: message.createdAt.toISOString()
        }))
      : [
          {
            id: `${ticket.id}-initial`,
            senderRole: "USER",
            message: ticket.message,
            readByAdmin: false,
            createdAt: ticket.createdAt.toISOString()
          },
          ...(ticket.adminReply
            ? [{
                id: `${ticket.id}-admin-reply`,
                senderRole: "ADMIN",
                message: ticket.adminReply,
                readByAdmin: true,
                createdAt: ticket.updatedAt.toISOString()
              }]
            : [])
        ]
  }));

  return (
    <AdminShell title="Support tickets">
      <AdminSupportInbox tickets={rows} />
    </AdminShell>
  );
}
