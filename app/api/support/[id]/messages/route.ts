import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const messageSchema = z.object({
  message: z.string().min(1)
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = messageSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true }
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const message = await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      senderUserId: session.user.id,
      senderRole: "USER",
      message: parsed.data.message,
      readByUser: true,
      readByAdmin: false
    }
  });

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status: "OPEN", updatedAt: new Date() }
  });

  return NextResponse.json(message, { status: 201 });
}
