import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Bell, Car, CreditCard, FileCheck2, MessageCircle, UserRound } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ReminderControls } from "@/components/reminder-controls";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [vehicles, drivers, requests, payments, notifications] = await Promise.all([
    prisma.vehicle.count({ where: { userId: session.user.id } }).catch(() => 0),
    prisma.driver.count({ where: { userId: session.user.id } }).catch(() => 0),
    prisma.serviceRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5
    }).catch(() => []),
    prisma.payment.aggregate({
      where: { userId: session.user.id, status: "SUCCESS" },
      _sum: { amount: true }
    }).catch(() => ({ _sum: { amount: 0 } })),
    prisma.notification.findMany({
      where: { userId: session.user.id, subject: { contains: "reminder", mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 5
    }).catch(() => [])
  ]);

  return (
    <DashboardShell title="Overview" description="Track vehicles, drivers, requests, payments, reminders, and support from one place.">
      <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
        <Stat icon={Car} label="Vehicles" value={vehicles} />
        <Stat icon={UserRound} label="Drivers" value={drivers} />
        <Stat icon={FileCheck2} label="Open requests" value={requests.length} />
        <Stat icon={CreditCard} label="Paid" value={formatNaira(payments._sum.amount || 0)} />
      </div>

      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-black">Recent requests</h2>
            <a href="/dashboard/requests/new?fresh=1" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white">Start request</a>
          </div>
          <div className="mt-4 grid gap-3">
            {requests.length ? (
              requests.map((request) => (
                <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 rounded border border-brand-900/10 p-3 sm:flex-nowrap">
                  <div className="min-w-0">
                    <p className="break-words font-bold">{request.title}</p>
                    <p className="text-sm text-ink/55">{request.requestCode}</p>
                  </div>
                  <Badge tone={request.status === "DELIVERED" ? "green" : "amber"}>{request.status.replaceAll("_", " ")}</Badge>
                </div>
              ))
            ) : (
              <p className="rounded bg-brand-50 p-4 text-sm font-semibold text-ink/65">No service requests yet.</p>
            )}
          </div>
        </div>
        <div className="grid min-w-0 gap-6">
          <div className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Bell className="text-brand-700" /> Renewal reminders
            </h2>
            <div className="mt-4 grid gap-3">
              {notifications.length ? notifications.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded border border-brand-900/10 p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{item.subject}</p>
                      <Badge tone={item.status === "READ" ? "gray" : "green"}>{item.status === "READ" ? "Off" : "On"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink/60">{item.message}</p>
                  </div>
                  <ReminderControls id={item.id} enabled={item.status !== "READ"} />
                </div>
              )) : <p className="text-sm text-ink/60">No reminders yet. New submitted services will create reminders automatically.</p>}
            </div>
          </div>
          <a href="https://wa.me/2348000000000" className="flex flex-wrap items-center justify-between gap-4 rounded bg-brand-800 p-5 font-black text-white">
            WhatsApp/call support <MessageCircle />
          </a>
        </div>
      </div>
    </DashboardShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Car; label: string; value: React.ReactNode }) {
  return (
    <div className="w-[calc((100vw-2.25rem)/2)] min-w-[calc((100vw-2.25rem)/2)] snap-start rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:w-auto sm:min-w-0 sm:p-5">
      <Icon className="text-brand-700" />
      <p className="mt-4 text-sm font-bold text-ink/55">{label}</p>
      <p className="mt-1 break-words text-2xl font-black">{value}</p>
    </div>
  );
}
