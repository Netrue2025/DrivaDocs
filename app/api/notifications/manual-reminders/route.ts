import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reminderSchema = z.object({
  serviceRequestId: z.string().min(1),
  expiryDate: z.string().min(1),
  reminderDate: z.string().min(1)
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = reminderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reminder details" }, { status: 400 });
  }

  const expiryDate = new Date(parsed.data.expiryDate);
  const reminderDate = new Date(parsed.data.reminderDate);
  if (Number.isNaN(expiryDate.getTime()) || Number.isNaN(reminderDate.getTime())) {
    return NextResponse.json({ error: "Invalid reminder or expiry date" }, { status: 400 });
  }
  if (reminderDate >= expiryDate) {
    return NextResponse.json({ error: "Reminder date must be before the document expiry date" }, { status: 400 });
  }

  const serviceRequest = await prisma.serviceRequest.findFirst({
    where: { id: parsed.data.serviceRequestId, userId: session.user.id },
    select: { id: true, title: true, requestCode: true }
  });
  if (!serviceRequest) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  const reminder = await prisma.notification.create({
    data: {
      userId: session.user.id,
      serviceRequestId: serviceRequest.id,
      channel: "IN_APP",
      status: "QUEUED",
      subject: `${serviceRequest.title} reminder`,
      message: `Reminder for ${serviceRequest.requestCode} set before document expiry.`,
      scheduledFor: reminderDate,
      metadata: {
        source: "MANUAL",
        expiryDate: expiryDate.toISOString()
      }
    }
  });

  return NextResponse.json(reminder, { status: 201 });
}
