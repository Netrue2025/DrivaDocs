import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { SupportInbox, type SupportTicketRow } from "@/components/support-inbox";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardSupportPage({
  searchParams
}: {
  searchParams?: { open?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } }
  }).catch(() => []);

  const rows: SupportTicketRow[] = tickets.map((ticket) => ({
    id: ticket.id,
    ticketNo: ticket.ticketNo,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    messages: ticket.messages.length
      ? ticket.messages.map((message) => ({
          id: message.id,
          senderRole: message.senderRole,
          message: message.message,
          readByUser: message.readByUser,
          createdAt: message.createdAt.toISOString()
        }))
      : [
          {
            id: `${ticket.id}-initial`,
            senderRole: "USER",
            message: ticket.message,
            readByUser: true,
            createdAt: ticket.createdAt.toISOString()
          },
          ...(ticket.adminReply
            ? [{
                id: `${ticket.id}-admin-reply`,
                senderRole: "ADMIN",
                message: ticket.adminReply,
                readByUser: true,
                createdAt: ticket.updatedAt.toISOString()
              }]
            : [])
        ]
  }));

  const openTicketId = searchParams?.open === "latest" ? rows[0]?.id : searchParams?.open;

  return (
    <DashboardShell title="Support" description="Read support replies, continue chats, and reopen previous conversations.">
      <SupportInbox tickets={rows} openTicketId={openTicketId} />
    </DashboardShell>
  );
}
