import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { driverSchema, toDriverData } from "@/lib/fleet-records";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const lockedStatuses = ["PROCESSING", "DOCUMENT_READY", "OUT_FOR_DELIVERY", "DELIVERED"];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = driverSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid driver" }, { status: 400 });
  const businessAccount = session.user.accountType === "BUSINESS"
    ? await prisma.businessAccount.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    : null;

  const data = parsed.data;
  const duplicate = await findDuplicateDriver(session.user.id, data);
  if (duplicate && await isDriverLocked(duplicate.id)) {
    return NextResponse.json({ error: "This driver already exists and is under process." }, { status: 409 });
  }
  const driverData = toDriverData(data, businessAccount?.id || null);
  const driver = duplicate
    ? await prisma.driver.update({
        where: { id: duplicate.id },
        data: driverData
      })
    : await prisma.driver.create({
        data: {
          userId: session.user.id,
          ...driverData
        }
      });

  return NextResponse.json(driver, { status: duplicate ? 200 : 201 });
}

async function findDuplicateDriver(userId: string, data: typeof driverSchema._type) {
  const or: Prisma.DriverWhereInput[] = [];
  const surname = data.surname.trim();
  const firstName = data.firstName.trim();

  if (data.nin?.trim()) or.push({ nin: { equals: data.nin.trim(), mode: "insensitive" } });
  if (data.phone?.trim()) {
    or.push({
      surname: { equals: surname, mode: "insensitive" },
      firstName: { equals: firstName, mode: "insensitive" },
      phone: { equals: data.phone.trim(), mode: "insensitive" }
    });
  }
  if (data.dateOfBirth) {
    or.push({
      surname: { equals: surname, mode: "insensitive" },
      firstName: { equals: firstName, mode: "insensitive" },
      dateOfBirth: new Date(data.dateOfBirth)
    });
  }
  if (!or.length) return null;

  return prisma.driver.findFirst({
    where: {
      userId,
      OR: or
    },
    orderBy: { createdAt: "desc" }
  });
}

async function isDriverLocked(id: string) {
  const count = await prisma.serviceRequest.count({
    where: {
      driverId: id,
      status: { in: lockedStatuses as never }
    }
  });
  return count > 0;
}
