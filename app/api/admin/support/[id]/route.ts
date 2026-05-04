import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const replySchema = z.object({
  adminReply: z.string().optional().or(z.literal("")),
  status: z.enum(["OPEN", "PENDING", "RESOLVED", "CLOSED"])
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN" && session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = replySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid response" }, { status: 400 });
  const reply = parsed.data.adminReply?.trim() || "";

  await prisma.supportMessage.updateMany({
    where: { ticketId: params.id, senderRole: "USER" },
    data: { readByAdmin: true }
  });

  const ticket = await prisma.supportTicket.update({
    where: { id: params.id },
    data: {
      ...(reply ? { adminReply: reply } : {}),
      status: parsed.data.status,
      ...(reply
        ? {
            messages: {
              create: {
                senderUserId: session.user.id,
                senderRole: "ADMIN",
                message: reply,
                readByUser: false,
                readByAdmin: true
              }
            }
          }
        : {})
    }
  });

  if (reply && ticket.userId) {
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        channel: "IN_APP",
        status: "QUEUED",
        subject: "Support reply",
        message: `New reply on ${ticket.ticketNo}: ${ticket.subject}`,
        metadata: {
          type: "SUPPORT_REPLY",
          ticketId: ticket.id
        }
      }
    });
  }

  return NextResponse.json(ticket);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN" && session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    select: { id: true, status: true }
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  if (ticket.status !== "CLOSED") {
    return NextResponse.json({ error: "Only closed support tickets can be deleted" }, { status: 400 });
  }

  await prisma.supportTicket.delete({ where: { id: ticket.id } });
  return NextResponse.json({ ok: true });
}
