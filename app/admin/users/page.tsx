import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          requests: true,
          vehicles: true,
          drivers: true
        }
      }
    }
  }).catch(() => []);

  return (
    <AdminShell title="User management">
      <section className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-brand-700">Users</p>
            <h2 className="mt-1 text-xl font-black">Verification and access control</h2>
          </div>
          <p className="rounded bg-brand-50 px-3 py-2 text-sm font-black text-brand-800">{users.length} users</p>
        </div>

        <div className="mt-5 overflow-x-auto rounded border border-brand-900/10">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-brand-50 text-ink/65">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Account</th>
                <th className="p-3">Activity</th>
                <th className="p-3">Verification</th>
                <th className="p-3">Access</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-brand-900/10">
                  <td className="p-3">
                    <p className="font-bold">{user.name || "Unnamed user"}</p>
                    <p className="text-xs text-ink/55">{user.email}</p>
                    {user.phone ? <p className="text-xs text-ink/45">{user.phone}</p> : null}
                  </td>
                  <td className="p-3">{user.role}</td>
                  <td className="p-3">{user.accountType}</td>
                  <td className="p-3 text-ink/62">
                    {user._count.requests} requests, {user._count.vehicles} vehicles, {user._count.drivers} drivers
                  </td>
                  <td className="p-3">
                    {user.emailVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}
                  </td>
                  <td className="p-3">
                    {user.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {!user.emailVerified ? (
                        <form action={`/api/admin/users/${user.id}`} method="post">
                          <input type="hidden" name="action" value="verify" />
                          <button className="rounded bg-brand-700 px-3 py-2 text-xs font-black text-white">Verify</button>
                        </form>
                      ) : null}
                      <form action={`/api/admin/users/${user.id}`} method="post">
                        <input type="hidden" name="action" value={user.isActive ? "deactivate" : "activate"} />
                        <button className={`rounded px-3 py-2 text-xs font-black ${user.isActive ? "bg-red-700 text-white" : "bg-road text-ink"}`}>
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length ? <p className="rounded bg-brand-50 p-4 text-sm font-semibold text-ink/65">No users found.</p> : null}
        </div>
      </section>
    </AdminShell>
  );
}
