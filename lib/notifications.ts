import { addDays, isBefore } from "date-fns";
import { prisma } from "@/lib/prisma";

export async function queueRenewalReminders(daysAhead = 30) {
  const threshold = addDays(new Date(), daysAhead);
  const vehicles = await prisma.vehicle.findMany({
    where: {
      OR: [
        { licenseExpiry: { lte: threshold } },
        { roadWorthinessExpiry: { lte: threshold } },
        { insuranceExpiry: { lte: threshold } }
      ]
    }
  });

  const created = [];
  for (const vehicle of vehicles) {
    const expiries = [
      ["Vehicle license", vehicle.licenseExpiry],
      ["Road worthiness", vehicle.roadWorthinessExpiry],
      ["Insurance", vehicle.insuranceExpiry]
    ] as const;

    for (const [label, expiry] of expiries) {
      if (!expiry || !isBefore(expiry, threshold)) continue;
      created.push(
        prisma.notification.create({
          data: {
            userId: vehicle.userId,
            channel: "IN_APP",
            subject: `${label} renewal reminder`,
            message: `${vehicle.make} ${vehicle.model} ${vehicle.registrationNo || ""} expires on ${expiry.toDateString()}.`,
            scheduledFor: new Date()
          }
        })
      );
    }
  }

  return Promise.all(created);
}
