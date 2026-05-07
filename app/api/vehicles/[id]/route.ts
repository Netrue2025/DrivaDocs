import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { toVehicleData, vehicleSchema } from "@/lib/fleet-records";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const lockedStatuses = ["PROCESSING", "DOCUMENT_READY", "OUT_FOR_DELIVERY", "DELIVERED"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = vehicleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid vehicle" }, { status: 400 });

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      serviceRequests: {
        where: { status: { in: lockedStatuses as never } },
        select: { id: true },
        take: 1
      }
    }
  });

  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  if (vehicle.serviceRequests.length) {
    return NextResponse.json({ error: "This vehicle is already under process and cannot be edited." }, { status: 409 });
  }

  const updated = await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: toVehicleData(parsed.data, vehicle.businessAccountId)
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      serviceRequests: {
        select: { id: true, status: true },
        take: 1
      }
    }
  });

  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  if (vehicle.serviceRequests.some((request) => lockedStatuses.includes(request.status))) {
    return NextResponse.json({ error: "This vehicle is already under process and cannot be deleted." }, { status: 409 });
  }
  if (vehicle.serviceRequests.length) {
    return NextResponse.json({ error: "This vehicle is linked to a service request and cannot be deleted." }, { status: 409 });
  }

  await prisma.vehicle.delete({ where: { id: vehicle.id } });
  if (vehicle.businessAccountId) {
    const fleetSize = await prisma.vehicle.count({ where: { businessAccountId: vehicle.businessAccountId } });
    await prisma.businessAccount.update({ where: { id: vehicle.businessAccountId }, data: { fleetSize } }).catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
