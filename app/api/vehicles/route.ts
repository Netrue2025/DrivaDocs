import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  registrationNo: z.string().optional().or(z.literal("")),
  chassisNo: z.string().optional().or(z.literal("")),
  engineNo: z.string().optional().or(z.literal("")),
  color: z.string().optional().or(z.literal("")),
  vehicleType: z.string().min(1),
  engineCategory: z.string().optional().or(z.literal("")),
  usage: z.string().default("PRIVATE"),
  licenseExpiry: z.string().optional().or(z.literal("")),
  roadWorthinessExpiry: z.string().optional().or(z.literal("")),
  insuranceExpiry: z.string().optional().or(z.literal(""))
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = vehicleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid vehicle" }, { status: 400 });

  const vehicle = await prisma.vehicle.create({
    data: {
      userId: session.user.id,
      make: parsed.data.make,
      model: parsed.data.model,
      registrationNo: parsed.data.registrationNo || null,
      chassisNo: parsed.data.chassisNo || null,
      engineNo: parsed.data.engineNo || null,
      color: parsed.data.color || null,
      vehicleType: parsed.data.vehicleType,
      engineCategory: parsed.data.engineCategory || null,
      usage: parsed.data.usage,
      licenseExpiry: parsed.data.licenseExpiry ? new Date(parsed.data.licenseExpiry) : null,
      roadWorthinessExpiry: parsed.data.roadWorthinessExpiry ? new Date(parsed.data.roadWorthinessExpiry) : null,
      insuranceExpiry: parsed.data.insuranceExpiry ? new Date(parsed.data.insuranceExpiry) : null
    }
  });

  return NextResponse.json(vehicle, { status: 201 });
}
