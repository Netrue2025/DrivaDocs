import { AdminContentManager } from "@/components/admin-content-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const [testimonials, faqs, newsItems] = await Promise.all([
    prisma.testimonial.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.faqItem.findMany({ orderBy: [{ sortOrder: "asc" }, { question: "asc" }] }).catch(() => []),
    prisma.newsItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }).catch(() => [])
  ]);

  return <AdminContentManager testimonials={testimonials} faqs={faqs} newsItems={newsItems} />;
}
