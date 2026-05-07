import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const userUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(["USER", "BUSINESS", "ADMIN", "SUPER_ADMIN"]),
  accountType: z.enum(["INDIVIDUAL", "BUSINESS"]),
  isActive: z.boolean(),
  emailVerified: z.boolean(),
  password: z.string().min(8).optional().or(z.literal("")),
  businessAccount: z.object({
    companyName: z.string().optional(),
    contactPerson: z.string().optional(),
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    officeAddress: z.string().optional(),
    fleetSize: z.number().int().nonnegative().optional()
  }).optional()
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const action = String(formData.get("action") || "");
  const redirectTo = request.headers.get("referer") || "/admin";

  if (action === "verify") {
    await prisma.user.update({
      where: { id: params.id },
      data: { emailVerified: new Date(), isActive: true }
    });
    return NextResponse.redirect(redirectTo, 303);
  }

  if (action === "deactivate" || action === "activate") {
    if (params.id === session.user.id && action === "deactivate") {
      return NextResponse.json({ error: "You cannot deactivate your own admin account." }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: action === "activate" }
    });
    return NextResponse.redirect(redirectTo, 303);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = userUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid user details." }, { status: 400 });
  }

  const data = parsed.data;
  if (params.id === session.user.id && !data.isActive) {
    return NextResponse.json({ error: "You cannot deactivate your own admin account." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: params.id },
    include: { businessAccount: true }
  });
  if (!existing) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : undefined;
  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      name: data.name?.trim() || null,
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      role: data.role,
      accountType: data.accountType,
      isActive: data.isActive,
      emailVerified: data.emailVerified ? existing.emailVerified || new Date() : null,
      passwordHash
    },
    include: {
      businessAccount: true,
      _count: { select: { requests: true, vehicles: true, drivers: true } }
    }
  });

  if (data.accountType === "BUSINESS" && data.businessAccount) {
    const business = data.businessAccount;
    const companyName = business.companyName?.trim() || existing.businessAccount?.companyName || data.name || "Business account";
    const contactPerson = business.contactPerson?.trim() || existing.businessAccount?.contactPerson || data.name || data.email;
    const officeAddress = business.officeAddress?.trim() || existing.businessAccount?.officeAddress || "Not provided";

    await prisma.businessAccount.upsert({
      where: { userId: params.id },
      update: {
        companyName,
        contactPerson,
        registrationNumber: business.registrationNumber?.trim() || null,
        taxId: business.taxId?.trim() || null,
        officeAddress,
        fleetSize: business.fleetSize ?? existing.businessAccount?.fleetSize ?? 0
      },
      create: {
        userId: params.id,
        companyName,
        contactPerson,
        registrationNumber: business.registrationNumber?.trim() || null,
        taxId: business.taxId?.trim() || null,
        officeAddress,
        fleetSize: business.fleetSize ?? 0
      }
    });
  }

  const refreshed = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      businessAccount: true,
      _count: { select: { requests: true, vehicles: true, drivers: true } }
    }
  });

  return NextResponse.json(refreshed || user);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (params.id === session.user.id) {
    return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, isActive: true }
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (user.isActive) {
    return NextResponse.json({ error: "Deactivate this user before deleting the account." }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
