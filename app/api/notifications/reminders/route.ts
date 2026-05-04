import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queueRenewalReminders } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN" && session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reminders = await queueRenewalReminders();
  return NextResponse.json({ queued: reminders.length });
}
