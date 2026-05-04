import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7).optional().or(z.literal("")),
  password: z.string().min(8),
  accountType: z.enum(["INDIVIDUAL", "BUSINESS"]),
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  officeAddress: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid registration details" }, { status: 400 });
    }

    const data = parsed.data;
    if (data.accountType === "BUSINESS" && (!data.companyName || !data.officeAddress)) {
      return NextResponse.json({ error: "Company name and office address are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        passwordHash,
        accountType: data.accountType,
        role: data.accountType === "BUSINESS" ? "BUSINESS" : "USER",
        businessAccount:
          data.accountType === "BUSINESS"
            ? {
                create: {
                  companyName: data.companyName!,
                  contactPerson: data.contactPerson || data.name,
                  officeAddress: data.officeAddress!
                }
              }
            : undefined
      }
    });

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json(
      { error: "Unable to connect to the database. Please check your DATABASE_URL/DIRECT_URL and try again." },
      { status: 503 }
    );
  }
}
