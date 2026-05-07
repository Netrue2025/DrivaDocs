import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { driverSchema, toDriverData, toVehicleData, vehicleSchema } from "@/lib/fleet-records";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const lockedStatuses = ["PROCESSING", "DOCUMENT_READY", "OUT_FOR_DELIVERY", "DELIVERED"];

export async function PATCH(request: Request, { params }: { params: { kind: string; id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (params.kind === "vehicles") {
    const parsed = vehicleSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid vehicle" }, { status: 400 });
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: { serviceRequests: { where: { status: { in: lockedStatuses as never } }, select: { id: true }, take: 1 } }
    });
    if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    if (vehicle.serviceRequests.length) return NextResponse.json({ error: "This vehicle is under process and cannot be edited." }, { status: 409 });

    const updated = await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: toVehicleData(parsed.data, vehicle.businessAccountId)
    });
    return NextResponse.json(updated);
  }

  if (params.kind === "drivers") {
    const parsed = driverSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid driver" }, { status: 400 });
    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      include: { requests: { where: { status: { in: lockedStatuses as never } }, select: { id: true }, take: 1 } }
    });
    if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    if (driver.requests.length) return NextResponse.json({ error: "This driver is under process and cannot be edited." }, { status: 409 });

    const updated = await prisma.driver.update({
      where: { id: driver.id },
      data: toDriverData(parsed.data, driver.businessAccountId)
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid fleet record type" }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: { params: { kind: string; id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (params.kind === "vehicles") {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: { serviceRequests: { select: { id: true, status: true } } }
    });
    if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    if (vehicle.serviceRequests.some((request) => lockedStatuses.includes(request.status))) {
      return NextResponse.json({ error: "This vehicle is under process and cannot be deleted." }, { status: 409 });
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

  if (params.kind === "drivers") {
    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      include: { requests: { select: { id: true, status: true } } }
    });
    if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    if (driver.requests.some((request) => lockedStatuses.includes(request.status))) {
      return NextResponse.json({ error: "This driver is under process and cannot be deleted." }, { status: 409 });
    }
    if (driver.requests.length) {
      return NextResponse.json({ error: "This driver is linked to a service request and cannot be deleted." }, { status: 409 });
    }
    await prisma.driver.delete({ where: { id: driver.id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid fleet record type" }, { status: 400 });
}
