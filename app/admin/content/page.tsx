import { AdminContentManager } from "@/components/admin-content-manager";
import { defaultGreetingSettings, getGreetingSettings } from "@/lib/greeting-settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const [testimonials, faqs, newsItems, greetingSettings] = await Promise.all([
    prisma.testimonial.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.faqItem.findMany({ orderBy: [{ sortOrder: "asc" }, { question: "asc" }] }).catch(() => []),
    prisma.newsItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }).catch(() => []),
    getGreetingSettings(prisma).catch(() => defaultGreetingSettings)
  ]);

  return <AdminContentManager testimonials={testimonials} faqs={faqs} newsItems={newsItems} greetingSettings={greetingSettings} />;
}
