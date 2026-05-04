import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { forwardContactMessage } from "@/lib/contact-email";
import { prisma } from "@/lib/prisma";
import { requestCode } from "@/lib/utils";

const ticketSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  subject: z.string().min(3),
  message: z.string().min(10)
});

export async function POST(request: Request) {
  const parsed = ticketSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter your full name, a subject, and a message of at least 10 characters." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const submittedEmail = parsed.data.email?.toLowerCase().trim() || "";
  const email = submittedEmail || session?.user.email?.toLowerCase().trim() || "";
  if (!email) {
    return NextResponse.json({ error: "Please continue with signup or login before sending this message." }, { status: 401 });
  }

  const owner = session?.user.id
    ? { id: session.user.id }
    : await prisma.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null);

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNo: requestCode("TKT"),
      userId: owner?.id,
      name: parsed.data.name,
      email,
      phone: parsed.data.phone || null,
      subject: parsed.data.subject,
      message: parsed.data.message,
      messages: {
        create: {
          senderUserId: owner?.id,
          senderRole: "USER",
          message: parsed.data.message,
          readByUser: true,
          readByAdmin: false
        }
      }
    }
  });

  let emailSent = false;
  try {
    const delivery = await forwardContactMessage(ticket);
    emailSent = delivery.sent;
  } catch (error) {
    console.error(error);
  }

  return NextResponse.json({ ...ticket, forwardedTo: "info@netrue.io", emailSent }, { status: 201 });
}
