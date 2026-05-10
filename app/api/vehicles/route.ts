import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { toVehicleData, vehicleSchema } from "@/lib/fleet-records";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = vehicleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid vehicle" }, { status: 400 });
  const businessAccount = session.user.accountType === "BUSINESS"
    ? await prisma.businessAccount.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    : null;

  const data = parsed.data;
  const vehicleData = toVehicleData(data, businessAccount?.id || null);
  const vehicle = await prisma.vehicle.create({
    data: {
      userId: session.user.id,
      ...vehicleData
    }
  });

  if (businessAccount) {
    const fleetSize = await prisma.vehicle.count({ where: { businessAccountId: businessAccount.id } });
    await prisma.businessAccount.update({
      where: { id: businessAccount.id },
      data: { fleetSize }
    }).catch(() => null);
  }

  return NextResponse.json(vehicle, { status: 201 });
}
