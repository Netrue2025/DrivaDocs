import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: action === "activate" }
    });
    return NextResponse.redirect(redirectTo, 303);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
