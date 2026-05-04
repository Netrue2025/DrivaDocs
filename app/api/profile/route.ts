import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload-storage";

const profileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional()
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, image: true, updatedAt: true }
  });
  if (!user) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || ""
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile details" }, { status: 400 });
  }
  const nextEmail = parsed.data.email.toLowerCase().trim();
  const existingEmailOwner = await prisma.user.findUnique({
    where: { email: nextEmail },
    select: { id: true }
  });
  if (existingEmailOwner && existingEmailOwner.id !== session.user.id) {
    return NextResponse.json({ error: "Another account already uses this email address" }, { status: 409 });
  }

  const image = formData.get("image");
  let imageUrl: string | undefined;
  if (image instanceof File && image.size > 0) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(image.type)) {
      return NextResponse.json({ error: "Profile picture must be PNG, JPG, or WEBP" }, { status: 400 });
    }
    if (image.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Profile picture must be under 2MB" }, { status: 400 });
    }
    const saved = await saveUploadedFile(image, `profiles/${session.user.id}`);
    imageUrl = saved.publicUrl;
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      email: nextEmail,
      phone: parsed.data.phone?.trim() || null,
      ...(imageUrl ? { image: imageUrl } : {})
    },
    select: { id: true, name: true, email: true, phone: true, image: true }
  });

  return NextResponse.json(user);
}
