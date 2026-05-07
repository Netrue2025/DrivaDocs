import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { driverSchema, toDriverData } from "@/lib/fleet-records";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const lockedStatuses = ["PROCESSING", "DOCUMENT_READY", "OUT_FOR_DELIVERY", "DELIVERED"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = driverSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid driver" }, { status: 400 });

  const driver = await prisma.driver.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      requests: {
        where: { status: { in: lockedStatuses as never } },
        select: { id: true },
        take: 1
      }
    }
  });

  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  if (driver.requests.length) {
    return NextResponse.json({ error: "This driver is already under process and cannot be edited." }, { status: 409 });
  }

  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data: toDriverData(parsed.data, driver.businessAccountId)
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const driver = await prisma.driver.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      requests: {
        select: { id: true, status: true },
        take: 1
      }
    }
  });

  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  if (driver.requests.some((request) => lockedStatuses.includes(request.status))) {
    return NextResponse.json({ error: "This driver is already under process and cannot be deleted." }, { status: 409 });
  }
  if (driver.requests.length) {
    return NextResponse.json({ error: "This driver is linked to a service request and cannot be deleted." }, { status: 409 });
  }

  await prisma.driver.delete({ where: { id: driver.id } });
  return NextResponse.json({ ok: true });
}
