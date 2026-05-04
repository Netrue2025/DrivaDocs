import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AdminContentManager } from "@/components/admin-content-manager";
import { AdminShell } from "@/components/admin-shell";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/dashboard");

  const [testimonials, faqs] = await Promise.all([
    prisma.testimonial.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.faqItem.findMany({ orderBy: [{ sortOrder: "asc" }, { question: "asc" }] }).catch(() => [])
  ]);

  return (
    <AdminShell title="Home content management">
      <AdminContentManager testimonials={testimonials} faqs={faqs} />
    </AdminShell>
  );
}
