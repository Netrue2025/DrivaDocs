import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const editableStatuses = ["DRAFT", "AWAITING_PAYMENT", "PAYMENT_CONFIRMED"];

const updateSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    label: z.string().optional(),
    details: z.record(z.string()).default({}),
    files: z.record(z.object({
      fileName: z.string(),
      mimeType: z.string(),
      fileSize: z.number().nonnegative(),
      storageKey: z.string(),
      publicUrl: z.string().optional()
    })).default({})
  })).min(1)
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid bulk order details" }, { status: 400 });

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const serviceRequest = await prisma.serviceRequest.findFirst({
    where: isAdmin ? { id: params.id } : { id: params.id, userId: session.user.id }
  });

  if (!serviceRequest) return NextResponse.json({ error: "Bulk order not found" }, { status: 404 });
  if (!editableStatuses.includes(serviceRequest.status)) {
    return NextResponse.json({ error: "This bulk order is already under process and cannot be edited." }, { status: 409 });
  }

  const requirements = asJsonObject(serviceRequest.requirements);
  if (requirements.bulkOrder !== true || !Array.isArray(requirements.items)) {
    return NextResponse.json({ error: "This is not a grouped fleet order." }, { status: 400 });
  }

  const updatesById = new Map(parsed.data.items.map((item) => [item.id, item]));
  const items = requirements.items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const current = item as Prisma.JsonObject;
    const id = typeof current.id === "string" ? current.id : "";
    const update = updatesById.get(id);
    if (!update) return current;
    return {
      ...current,
      label: update.label || current.label,
      details: update.details,
      files: update.files
    };
  });

  const updated = await prisma.serviceRequest.update({
    where: { id: serviceRequest.id },
    data: {
      requirements: {
        ...requirements,
        items
      }
    }
  });

  return NextResponse.json(updated);
}

function asJsonObject(value: unknown): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Prisma.JsonObject) : {};
}
