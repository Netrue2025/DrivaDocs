import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true }
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  await prisma.supportMessage.updateMany({
    where: { ticketId: ticket.id, senderRole: "ADMIN" },
    data: { readByUser: true }
  });

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      status: "QUEUED",
      metadata: {
        path: ["ticketId"],
        equals: ticket.id
      }
    },
    data: { status: "READ" }
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
