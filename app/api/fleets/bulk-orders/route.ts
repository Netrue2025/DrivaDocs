import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import type { PricingServiceType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { resolveFleetAmount } from "@/lib/fleet-pricing";
import { prisma } from "@/lib/prisma";
import { serviceLabels, type PricingItem } from "@/lib/pricing-catalog";
import { requestCode, splitPayment } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bulkOrderSchema = z.object({
  target: z.enum(["VEHICLE", "DRIVER"]),
  serviceType: z.string().min(1),
  ids: z.array(z.string().min(1)).min(1),
  submissionMode: z.enum(["PAY", "PAY_LATER"]).default("PAY_LATER"),
  details: z.record(z.record(z.string())).default({}),
  files: z.record(z.record(z.object({
    fileName: z.string(),
    mimeType: z.string(),
    fileSize: z.number().nonnegative(),
    storageKey: z.string(),
    publicUrl: z.string().optional()
  }))).default({}),
  deliveryAddress: z.object({
    recipientName: z.string().optional(),
    phone: z.string().min(1),
    addressLine: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    deliveryMethod: z.string().optional()
  })
});

const vehicleServices = new Set([
  "VEHICLE_PAPER_RENEWAL",
  "NEW_VEHICLE_REGISTRATION",
  "CHANGE_OF_OWNERSHIP",
  "OTHER_PERMIT",
  "FADED_NUMBER_PLATE_REPRINT"
]);

const driverServices = new Set([
  "NEW_DRIVERS_LICENSE",
  "DRIVERS_LICENSE_RENEWAL",
  "INTERNATIONAL_DRIVERS_LICENSE",
  "NEW_MOTORCYCLE_RIDERS_LICENSE",
  "MOTORCYCLE_RIDERS_LICENSE_RENEWAL"
]);

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.accountType !== "BUSINESS") {
    return NextResponse.json({ error: "Bulk fleet orders are available to business accounts only." }, { status: 403 });
  }

  const parsed = bulkOrderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Select at least one fleet item and a valid service." }, { status: 400 });
  }

  const businessAccount = await prisma.businessAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true }
  });
  if (!businessAccount) {
    return NextResponse.json({ error: "Business profile not found." }, { status: 404 });
  }

  const data = { ...parsed.data, ids: Array.from(new Set(parsed.data.ids)) };
  const validService = data.target === "VEHICLE" ? vehicleServices.has(data.serviceType) : driverServices.has(data.serviceType);
  if (!validService) {
    return NextResponse.json({ error: "Selected service does not match this bulk order type." }, { status: 400 });
  }

  const pricingRows = await prisma.servicePricing
    .findMany({ where: { active: true, serviceType: data.serviceType as PricingServiceType } })
    .catch(() => []);
  const pricing = pricingRows.map((row): PricingItem => ({
    serviceType: row.serviceType,
    serviceName: row.serviceName,
    vehicleType: row.vehicleType || undefined,
    engineCategory: row.engineCategory || undefined,
    usage: row.usage || undefined,
    state: row.state || undefined,
    location: row.location || undefined,
    amount: row.amount,
    notes: row.notes || undefined
  }));

  if (data.target === "VEHICLE") {
    const vehicles = await prisma.vehicle.findMany({
      where: {
        id: { in: data.ids },
        userId: session.user.id,
        businessAccountId: businessAccount.id
      }
    });
    if (!vehicles.length) return NextResponse.json({ error: "No matching vehicles found." }, { status: 404 });

    const items = vehicles.map((vehicle) => {
      const details = data.details[vehicle.id] || {};
      const files = data.files[vehicle.id] || {};
      return {
        id: vehicle.id,
        label: vehicle.registrationNo || `${vehicle.make} ${vehicle.model}`,
        amount: resolveFleetAmount(data.serviceType, pricing, vehicle.vehicleType, vehicle.engineCategory, vehicle.usage),
        make: vehicle.make,
        model: vehicle.model,
        registrationNo: vehicle.registrationNo,
        chassisNo: vehicle.chassisNo,
        vehicleType: vehicle.vehicleType,
        details,
        files
      };
    });
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const split = splitPayment(total);
    const serviceName = serviceLabels[data.serviceType as keyof typeof serviceLabels];
    const deliveryAddressData = {
      userId: session.user.id,
      recipientName: data.deliveryAddress.recipientName || session.user.name || session.user.email || "DrivaDocs client",
      phone: data.deliveryAddress.phone,
      addressLine: data.deliveryAddress.addressLine,
      city: data.deliveryAddress.city,
      state: data.deliveryAddress.state,
      deliveryMethod: data.deliveryAddress.deliveryMethod || "PHYSICAL_DELIVERY"
    };
    const created = await prisma.serviceRequest.create({
      data: {
        requestCode: requestCode(),
        userId: session.user.id,
        businessAccountId: businessAccount.id,
        serviceType: data.serviceType as PricingServiceType,
        title: `Bulk ${serviceName} - ${items.length} vehicle${items.length === 1 ? "" : "s"}`,
        state: "Lagos",
        status: "AWAITING_PAYMENT",
        requirements: {
          bulkOrder: true,
          fleetTarget: "VEHICLE",
          itemCount: items.length,
          items
        },
        estimateSubtotal: total,
        deliveryFee: 0,
        totalAmount: total,
        upfrontAmount: split.upfront,
        balanceAmount: split.balance,
        deliveryAddress: { create: deliveryAddressData },
        notifications: {
          create: {
            userId: session.user.id,
            channel: "IN_APP",
            subject: data.submissionMode === "PAY" ? "Bulk fleet order ready for payment" : "Bulk fleet order saved",
            message: `${serviceName} was grouped into one order for ${items.length} vehicle${items.length === 1 ? "" : "s"}.`
          }
        }
      }
    });

    return NextResponse.json({ requestId: created.id, count: items.length, total, upfrontAmount: split.upfront, balanceAmount: split.balance }, { status: 201 });
  }

  const drivers = await prisma.driver.findMany({
    where: {
      id: { in: data.ids },
      userId: session.user.id,
      businessAccountId: businessAccount.id
    }
  });
  if (!drivers.length) return NextResponse.json({ error: "No matching drivers found." }, { status: 404 });

  const items = drivers.map((driver) => {
    const driverName = [driver.surname, driver.firstName, driver.lastName].filter(Boolean).join(" ");
    const details = data.details[driver.id] || {};
    const files = data.files[driver.id] || {};
    return {
      id: driver.id,
      label: driverName,
      amount: resolveFleetAmount(data.serviceType, pricing),
      phone: driver.phone,
      licenseNo: driver.licenseNo,
      riderLicenseNo: driver.riderLicenseNo,
      details,
      files
    };
  });
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const split = splitPayment(total);
  const serviceName = serviceLabels[data.serviceType as keyof typeof serviceLabels];
  const deliveryAddressData = {
    userId: session.user.id,
    recipientName: data.deliveryAddress.recipientName || session.user.name || session.user.email || "DrivaDocs client",
    phone: data.deliveryAddress.phone,
    addressLine: data.deliveryAddress.addressLine,
    city: data.deliveryAddress.city,
    state: data.deliveryAddress.state,
    deliveryMethod: data.deliveryAddress.deliveryMethod || "PHYSICAL_DELIVERY"
  };
  const created = await prisma.serviceRequest.create({
    data: {
      requestCode: requestCode(),
      userId: session.user.id,
      businessAccountId: businessAccount.id,
      serviceType: data.serviceType as PricingServiceType,
      title: `Bulk ${serviceName} - ${items.length} driver${items.length === 1 ? "" : "s"}`,
      state: "Lagos",
      status: "AWAITING_PAYMENT",
      requirements: {
        bulkOrder: true,
        fleetTarget: "DRIVER",
        itemCount: items.length,
        items
      },
      estimateSubtotal: total,
      deliveryFee: 0,
      totalAmount: total,
      upfrontAmount: split.upfront,
      balanceAmount: split.balance,
      deliveryAddress: { create: deliveryAddressData },
      notifications: {
        create: {
          userId: session.user.id,
          channel: "IN_APP",
          subject: data.submissionMode === "PAY" ? "Bulk driver order ready for payment" : "Bulk driver order saved",
          message: `${serviceName} was grouped into one order for ${items.length} driver${items.length === 1 ? "" : "s"}.`
        }
      }
    }
  });

  return NextResponse.json({ requestId: created.id, count: items.length, total, upfrontAmount: split.upfront, balanceAmount: split.balance }, { status: 201 });
}
