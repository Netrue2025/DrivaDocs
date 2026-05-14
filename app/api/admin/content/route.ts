import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentSchema = z.object({
  action: z.enum(["create", "update", "delete"]),
  type: z.enum(["testimonial", "faq", "news", "greeting"]),
  id: z.string().optional(),
  enabled: z.union([z.literal("true"), z.boolean()]).optional(),
  published: z.union([z.literal("true"), z.boolean()]).optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  link: z.string().optional(),
  name: z.string().optional(),
  role: z.string().optional(),
  company: z.string().optional(),
  quote: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  question: z.string().optional(),
  answer: z.string().optional(),
  category: z.string().optional(),
  delaySeconds: z.coerce.number().int().min(0).max(3600).optional(),
  sortOrder: z.coerce.number().int().optional()
});

export async function POST(request: Request) {
  const [{ getServerSession }, { authOptions }, { prisma }] = await Promise.all([
    import("next-auth"),
    import("@/lib/auth"),
    import("@/lib/prisma")
  ]);
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

  if (data.type === "greeting") {
    if (data.action !== "update") {
      return NextResponse.json({ error: "Greeting settings can only be updated" }, { status: 400 });
    }
    const { saveGreetingSettings } = await import("@/lib/greeting-settings");
    const item = await saveGreetingSettings(prisma, {
      enabled: data.enabled === true || data.enabled === "true",
      delaySeconds: data.delaySeconds,
      title: data.title,
      message: data.message
    });
    return NextResponse.json(item);
  }

  if (data.action === "delete") {
    if (!data.id) return NextResponse.json({ error: "Missing item id" }, { status: 400 });
    if (data.type === "testimonial") {
      await prisma.testimonial.delete({ where: { id: data.id } });
    } else if (data.type === "news") {
      await prisma.newsItem.delete({ where: { id: data.id } });
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

  if (data.type === "news") {
    if (!data.title) {
      return NextResponse.json({ error: "News title is required" }, { status: 400 });
    }
    const payload = {
      title: data.title.trim(),
      link: data.link?.trim() || null,
      sortOrder: data.sortOrder || 0,
      published
    };
    const item = data.action === "create"
      ? await prisma.newsItem.create({ data: payload })
      : await prisma.newsItem.update({ where: { id: data.id as string }, data: payload });
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
