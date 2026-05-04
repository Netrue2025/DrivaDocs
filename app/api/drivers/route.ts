import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const driverSchema = z.object({
  surname: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  mothersMaidenName: z.string().optional().or(z.literal("")),
  nextOfKinPhone: z.string().optional().or(z.literal("")),
  facialMark: z.string().optional().or(z.literal("")),
  disability: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  stateOfOrigin: z.string().optional().or(z.literal("")),
  localGovernment: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  nin: z.string().optional().or(z.literal(""))
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = driverSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid driver" }, { status: 400 });

  const driver = await prisma.driver.create({
    data: {
      userId: session.user.id,
      surname: parsed.data.surname,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName || null,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      mothersMaidenName: parsed.data.mothersMaidenName || null,
      nextOfKinPhone: parsed.data.nextOfKinPhone || null,
      facialMark: parsed.data.facialMark || null,
      disability: parsed.data.disability || null,
      phone: parsed.data.phone || null,
      stateOfOrigin: parsed.data.stateOfOrigin || null,
      localGovernment: parsed.data.localGovernment || null,
      address: parsed.data.address || null,
      nin: parsed.data.nin || null
    }
  });

  return NextResponse.json(driver, { status: 201 });
}
