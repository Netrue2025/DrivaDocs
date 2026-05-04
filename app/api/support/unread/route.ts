import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ count: 0, latestTicketId: null });

  const [count, latest] = await Promise.all([
    prisma.supportMessage.count({
      where: {
        readByUser: false,
        senderRole: "ADMIN",
        ticket: { userId: session.user.id }
      }
    }).catch(() => 0),
    prisma.supportMessage.findFirst({
      where: {
        readByUser: false,
        senderRole: "ADMIN",
        ticket: { userId: session.user.id }
      },
      orderBy: { createdAt: "desc" },
      select: { ticketId: true }
    }).catch(() => null)
  ]);

  return NextResponse.json({ count, latestTicketId: latest?.ticketId || null });
}
