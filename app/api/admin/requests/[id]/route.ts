import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma, RequestStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { sendDocumentReadyEmail } from "@/lib/document-email";
import { sendPaymentSuccessEmail } from "@/lib/payment-email";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedStatuses = new Set<RequestStatus>([
  "PROCESSING",
  "CANCELLED",
  "DOCUMENT_READY",
  "DELIVERED"
]);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const action = String(formData.get("action") || "");
  const redirectTo = request.headers.get("referer") || "/admin";

  if (action === "delete") {
    await prisma.serviceRequest.delete({ where: { id: params.id } });
    return NextResponse.redirect(redirectTo, 303);
  }

  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: params.id },
    include: { user: true, payments: true }
  });

  if (!serviceRequest) {
    return NextResponse.json({ error: "Service request not found" }, { status: 404 });
  }

  if (action === "status") {
    const status = String(formData.get("status") || "") as RequestStatus;
    const adminNote = String(formData.get("adminNote") || "").trim();
    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const requirements = asJsonObject(serviceRequest.requirements);
    const adminNotes = getAdminNotes(requirements);
    const nextRequirements: Prisma.InputJsonObject = {
      ...requirements,
      adminNotes: adminNote
        ? [
            ...adminNotes,
            {
              note: adminNote,
              status,
              by: session.user.email || session.user.name || "Admin",
              at: new Date().toISOString()
            }
          ]
        : adminNotes
    };

    const updatedRequest = await prisma.serviceRequest.update({
      where: { id: params.id },
      data: {
        status,
        requirements: nextRequirements,
        notifications: adminNote
          ? {
              create: {
                userId: serviceRequest.userId,
                channel: "IN_APP",
                subject: "Service request update",
                message: adminNote
              }
            }
          : undefined
      },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        deliveryAddress: true
      }
    });

    if (status === "DOCUMENT_READY" && serviceRequest.status !== "DOCUMENT_READY") {
      try {
        await sendDocumentReadyEmail(updatedRequest);
      } catch (error) {
        console.error(error);
      }
    }

    return NextResponse.redirect(redirectTo, 303);
  }

  if (action === "assign") {
    const assignedAdminId = String(formData.get("assignedAdminId") || "");
    await prisma.serviceRequest.update({
      where: { id: params.id },
      data: { assignedAdminId: assignedAdminId || null }
    });
    return NextResponse.redirect(redirectTo, 303);
  }

  if (action === "mark-paid") {
    const paymentType = String(formData.get("paymentType") || "UPFRONT_75");
    const paidAmount = serviceRequest.payments
      .filter((payment) => payment.status === "SUCCESS")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const remainingAmount = Math.max(serviceRequest.totalAmount - paidAmount, 0);
    const upfrontDue = Math.max((serviceRequest.upfrontAmount || serviceRequest.totalAmount) - paidAmount, 0);
    const amount = paymentType === "FULL" ? remainingAmount : upfrontDue;
    const storedPaymentType = paymentType === "FULL" && paidAmount > 0 ? "BALANCE_25" : paymentType === "FULL" ? "FULL" : "UPFRONT_75";

    if (amount <= 0) {
      return NextResponse.redirect(redirectTo, 303);
    }

    const payment = await prisma.payment.create({
      data: {
        userId: serviceRequest.userId,
        serviceRequestId: serviceRequest.id,
        amount,
        type: storedPaymentType as never,
        status: "SUCCESS",
        paidAt: new Date(),
        receiptNo: `ADMIN-${Date.now()}`,
        providerReference: `ADMIN-${serviceRequest.id}-${Date.now()}`
      }
    });

    const nextPaidAmount = paidAmount + amount;
    const fullyPaid = nextPaidAmount >= serviceRequest.totalAmount;

    const updatedRequest = await prisma.serviceRequest.update({
      where: { id: serviceRequest.id },
      data: {
        status: fullyPaid ? "PAYMENT_CONFIRMED" : "AWAITING_PAYMENT",
        notifications: {
          create: {
            userId: serviceRequest.userId,
            channel: "IN_APP",
            subject: fullyPaid ? "Payment completed" : "Upfront payment confirmed",
            message: fullyPaid
              ? "Your DrivaDocs payment has been marked as fully paid."
              : "Your 75% upfront payment has been marked as paid. Please pay the remaining balance from your dashboard."
          }
        }
      },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        payments: true,
        deliveryAddress: true
      }
    });

    try {
      await sendPaymentSuccessEmail({ request: updatedRequest, payment });
    } catch (error) {
      console.error(error);
    }

    return NextResponse.redirect(redirectTo, 303);
  }

  if (action === "upload-document") {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
    const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png"]);
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const isAllowedFile = allowedTypes.has(file.type) || allowedExtensions.has(extension);
    if (!isAllowedFile || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Only PDF/JPG/PNG files up to 5MB are allowed" }, { status: 400 });
    }
    const mimeType = file.type || (extension === "pdf" ? "application/pdf" : extension === "png" ? "image/png" : "image/jpeg");

    const stored = await saveUploadedFile(file, `admin-renewed/${serviceRequest.id}`);

    await prisma.uploadedDocument.create({
      data: {
        userId: serviceRequest.userId,
        serviceRequestId: serviceRequest.id,
        kind: "RENEWED_DOCUMENT",
        fileName: file.name,
        mimeType,
        fileSize: file.size,
        storageKey: stored.storageKey,
        publicUrl: stored.publicUrl,
        verifiedAt: new Date()
      }
    });

    const updatedRequest = await prisma.serviceRequest.update({
      where: { id: serviceRequest.id },
      data: { status: "DOCUMENT_READY" },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        deliveryAddress: true
      }
    });

    if (serviceRequest.status !== "DOCUMENT_READY") {
      try {
        await sendDocumentReadyEmail(updatedRequest);
      } catch (error) {
        console.error(error);
      }
    }

    return NextResponse.redirect(redirectTo, 303);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

function asJsonObject(value: unknown): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Prisma.JsonObject)
    : {};
}

function getAdminNotes(requirements: Prisma.JsonObject) {
  const notes = requirements.adminNotes;
  return Array.isArray(notes) ? notes : [];
}
