import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestCode } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  requestId: z.string().optional(),
  serviceType: z.string(),
  title: z.string(),
  state: z.string().optional(),
  vehicleType: z.string().optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  requirements: z.record(z.unknown()).default({}),
  documents: z.array(z.object({
    fileName: z.string(),
    mimeType: z.string(),
    fileSize: z.number().nonnegative(),
    storageKey: z.string(),
    publicUrl: z.string().optional()
  })).default([]),
  estimateSubtotal: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  upfrontAmount: z.number().nonnegative(),
  balanceAmount: z.number().nonnegative(),
  submissionMode: z.enum(["SAVE", "PAY_LATER", "PAY"]).default("PAY"),
  deliveryAddress: z.object({
    recipientName: z.string().min(1).optional(),
    phone: z.string().min(1),
    addressLine: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1)
  }).optional()
});

export async function POST(request: Request) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message || "Invalid service request. Please check the required fields." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const requestData = {
      requestCode: requestCode(),
      userId: session.user.id,
      serviceType: data.serviceType as never,
      title: data.title,
      state: data.state,
      vehicleId: data.vehicleId || null,
      driverId: data.driverId || null,
      status: data.submissionMode === "SAVE" ? ("DRAFT" as const) : ("AWAITING_PAYMENT" as const),
      requirements: data.requirements as Prisma.InputJsonValue,
      estimateSubtotal: data.estimateSubtotal,
      deliveryFee: data.deliveryFee,
      totalAmount: data.totalAmount,
      upfrontAmount: data.upfrontAmount,
      balanceAmount: data.balanceAmount
  };
  const deliveryAddressData = data.deliveryAddress
    ? {
        userId: session.user.id,
        recipientName: data.deliveryAddress.recipientName || session.user.name || session.user.email || "DrivaDocs client",
        phone: data.deliveryAddress.phone,
        addressLine: data.deliveryAddress.addressLine,
        city: data.deliveryAddress.city,
        state: data.deliveryAddress.state
      }
    : undefined;
  const documentRows = data.documents.map((doc, index) => ({
    userId: session.user.id,
    kind: "OTHER" as const,
    fileName: doc.fileName || `document-${index + 1}`,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    storageKey: doc.storageKey,
    publicUrl: doc.publicUrl
  }));

  if (data.requestId) {
    const existing = await prisma.serviceRequest.findFirst({
      where: {
        id: data.requestId,
        userId: session.user.id,
        status: { in: ["DRAFT", "AWAITING_PAYMENT"] }
      },
      include: { deliveryAddress: true }
    });

    if (!existing) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }

    const updated = await prisma.serviceRequest.update({
      where: { id: existing.id },
      data: {
        ...requestData,
        requestCode: existing.requestCode,
        userId: existing.userId,
        deliveryAddress: deliveryAddressData
          ? existing.deliveryAddress
            ? { update: deliveryAddressData }
            : { create: deliveryAddressData }
          : undefined,
        documents: documentRows.length ? { create: documentRows } : undefined,
        notifications: {
          create: {
            userId: session.user.id,
            channel: "IN_APP",
            subject: data.submissionMode === "SAVE" ? "Service request saved" : "Service request updated",
            message:
              data.submissionMode === "SAVE"
                ? `${data.title} has been saved as a draft.`
                : `${data.title} has been updated and is awaiting payment.`
          }
        }
      }
    });

    if (data.submissionMode !== "SAVE") {
      await ensureServiceReminder(updated.id, session.user.id, data.title);
    }

    return NextResponse.json(updated, { status: 200 });
  }

  const created = await prisma.serviceRequest.create({
    data: {
      ...requestData,
      deliveryAddress: deliveryAddressData ? { create: deliveryAddressData } : undefined,
      documents: {
        create: documentRows
      },
      notifications: {
        create: {
          userId: session.user.id,
          channel: "IN_APP",
          subject: data.submissionMode === "SAVE" ? "Service request saved" : "Service request submitted",
          message:
            data.submissionMode === "SAVE"
              ? `${data.title} has been saved as a draft.`
              : `${data.title} is awaiting payment confirmation.`
        }
      }
    }
  });

  if (data.submissionMode !== "SAVE") {
    await ensureServiceReminder(created.id, session.user.id, data.title);
  }

  return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Service request failed", error);
    return NextResponse.json(
      { error: "Unable to save this service request. Please try again or contact support if it continues." },
      { status: 500 }
    );
  }
}

async function ensureServiceReminder(serviceRequestId: string, userId: string, title: string) {
  const existing = await prisma.notification.findFirst({
    where: {
      serviceRequestId,
      userId,
      subject: { contains: "reminder", mode: "insensitive" }
    }
  });

  if (existing) return;

  await prisma.notification.create({
    data: {
      userId,
      serviceRequestId,
      channel: "IN_APP",
      status: "QUEUED",
      subject: `${title} reminder`,
      message: `Reminder is on for ${title}. You can switch it off or cancel it from your dashboard.`,
      scheduledFor: new Date(),
      metadata: { type: "SERVICE_REMINDER", enabledByDefault: true }
    }
  });
}
