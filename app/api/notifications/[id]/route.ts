import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reminderSchema = z.object({
  enabled: z.boolean()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = reminderSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid reminder" }, { status: 400 });

  await prisma.notification.updateMany({
    where: { id: params.id, userId: session.user.id, subject: { contains: "reminder", mode: "insensitive" } },
    data: { status: parsed.data.enabled ? "QUEUED" : "READ" }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.deleteMany({
    where: { id: params.id, userId: session.user.id, subject: { contains: "reminder", mode: "insensitive" } }
  });

  return NextResponse.json({ ok: true });
}
