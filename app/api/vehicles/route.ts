import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { toVehicleData, vehicleSchema } from "@/lib/fleet-records";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const lockedStatuses = ["PROCESSING", "DOCUMENT_READY", "OUT_FOR_DELIVERY", "DELIVERED"];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = vehicleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid vehicle" }, { status: 400 });
  const businessAccount = session.user.accountType === "BUSINESS"
    ? await prisma.businessAccount.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    : null;

  const data = parsed.data;
  const duplicate = await findDuplicateVehicle(session.user.id, data);
  if (duplicate && await isVehicleLocked(duplicate.id)) {
    return NextResponse.json({ error: "This vehicle already exists and is under process." }, { status: 409 });
  }
  const vehicleData = toVehicleData(data, businessAccount?.id || null);
  const vehicle = duplicate
    ? await prisma.vehicle.update({
        where: { id: duplicate.id },
        data: vehicleData
      })
    : await prisma.vehicle.create({
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

  return NextResponse.json(vehicle, { status: duplicate ? 200 : 201 });
}

async function findDuplicateVehicle(userId: string, data: typeof vehicleSchema._type) {
  const or: Prisma.VehicleWhereInput[] = [];
  if (data.registrationNo?.trim()) or.push({ registrationNo: { equals: data.registrationNo.trim(), mode: "insensitive" } });
  if (data.chassisNo?.trim()) or.push({ chassisNo: { equals: data.chassisNo.trim(), mode: "insensitive" } });
  if (data.engineNo?.trim()) or.push({ engineNo: { equals: data.engineNo.trim(), mode: "insensitive" } });
  if (!or.length) return null;

  return prisma.vehicle.findFirst({
    where: {
      userId,
      OR: or
    },
    orderBy: { createdAt: "desc" }
  });
}

async function isVehicleLocked(id: string) {
  const count = await prisma.serviceRequest.count({
    where: {
      vehicleId: id,
      status: { in: lockedStatuses as never }
    }
  });
  return count > 0;
}
