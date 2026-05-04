import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const contentSchema = z.object({
  action: z.enum(["create", "update", "delete"]),
  type: z.enum(["testimonial", "faq"]),
  id: z.string().optional(),
  published: z.union([z.literal("true"), z.boolean()]).optional(),
  name: z.string().optional(),
  role: z.string().optional(),
  company: z.string().optional(),
  quote: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  question: z.string().optional(),
  answer: z.string().optional(),
  category: z.string().optional(),
  sortOrder: z.coerce.number().int().optional()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = contentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid content details" }, { status: 400 });
  }

  const data = parsed.data;
  const published = data.published === true || data.published === "true";

  if (data.action === "delete") {
    if (!data.id) return NextResponse.json({ error: "Missing item id" }, { status: 400 });
    if (data.type === "testimonial") {
      await prisma.testimonial.delete({ where: { id: data.id } });
    } else {
      await prisma.faqItem.delete({ where: { id: data.id } });
    }
    return NextResponse.json({ ok: true });
  }
  if (data.action === "update" && !data.id) {
    return NextResponse.json({ error: "Missing item id" }, { status: 400 });
  }

  if (data.type === "testimonial") {
    if (!data.name || !data.quote) {
      return NextResponse.json({ error: "Name and testimony are required" }, { status: 400 });
    }
    const payload = {
      name: data.name.trim(),
      role: data.role?.trim() || null,
      company: data.company?.trim() || null,
      quote: data.quote.trim(),
      rating: data.rating || 5,
      published
    };
    const item = data.action === "create"
      ? await prisma.testimonial.create({ data: payload })
      : await prisma.testimonial.update({ where: { id: data.id as string }, data: payload });
    return NextResponse.json(item);
  }

  if (!data.question || !data.answer) {
    return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
  }
  const payload = {
    question: data.question.trim(),
    answer: data.answer.trim(),
    category: data.category?.trim() || null,
    sortOrder: data.sortOrder || 0,
    published
  };
  const item = data.action === "create"
    ? await prisma.faqItem.create({ data: payload })
    : await prisma.faqItem.update({ where: { id: data.id as string }, data: payload });
  return NextResponse.json(item);
}
