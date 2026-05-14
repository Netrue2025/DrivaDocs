import { NextResponse } from "next/server";
import { defaultGreetingSettings, getGreetingSettings } from "@/lib/greeting-settings";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getGreetingSettings(prisma).catch(() => defaultGreetingSettings);
  return NextResponse.json(settings);
}
