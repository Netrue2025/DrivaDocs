import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Bell } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ManualReminderForm } from "@/components/manual-reminder-form";
import { ReminderControls } from "@/components/reminder-controls";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [services, reminders] = await Promise.all([
    prisma.serviceRequest.findMany({
      where: { userId: session.user.id, status: { not: "DRAFT" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        requestCode: true,
        serviceType: true
      }
    }).catch(() => []),
    prisma.notification.findMany({
      where: { userId: session.user.id, subject: { contains: "reminder", mode: "insensitive" } },
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }]
    }).catch(() => [])
  ]);

  return (
    <DashboardShell title="Reminders" description="Create, switch off, or cancel renewal reminders for your existing services.">
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <h2 className="mb-3 text-xl font-black">Create manual reminder</h2>
          {services.length ? (
            <ManualReminderForm
              services={services.map((service) => ({
                id: service.id,
                title: service.title,
                requestCode: service.requestCode,
                serviceType: service.serviceType
              }))}
            />
          ) : (
            <p className="rounded border border-brand-900/10 bg-white p-4 text-sm font-semibold text-ink/65 shadow-sm">
              Start a service request first, then you can create a reminder for it here.
            </p>
          )}
        </div>

        <div className="rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Bell className="text-brand-700" /> Existing reminders
          </h2>
          <div className="mt-4 grid gap-3">
            {reminders.length ? reminders.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded border border-brand-900/10 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{item.subject}</p>
                    <Badge tone={item.status === "READ" ? "gray" : "green"}>{item.status === "READ" ? "Off" : "On"}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink/60">{item.message}</p>
                  {item.scheduledFor ? (
                    <p className="mt-2 text-xs font-bold uppercase text-brand-700">
                      Reminder date: {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(item.scheduledFor)}
                    </p>
                  ) : null}
                </div>
                <ReminderControls id={item.id} enabled={item.status !== "READ"} />
              </div>
            )) : (
              <p className="rounded bg-brand-50 p-4 text-sm font-semibold text-ink/65">No reminders yet.</p>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
