import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AdminUserManager } from "@/components/admin-user-manager";
import { AdminShell } from "@/components/admin-shell";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      businessAccount: true,
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
      <AdminUserManager
        currentUserId={session.user.id}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          accountType: user.accountType,
          isActive: user.isActive,
          emailVerified: user.emailVerified?.toISOString() || null,
          createdAt: user.createdAt.toISOString(),
          businessAccount: user.businessAccount
            ? {
                companyName: user.businessAccount.companyName,
                contactPerson: user.businessAccount.contactPerson,
                registrationNumber: user.businessAccount.registrationNumber,
                taxId: user.businessAccount.taxId,
                officeAddress: user.businessAccount.officeAddress,
                fleetSize: user.businessAccount.fleetSize
              }
            : null,
          _count: user._count
        }))}
      />
    </AdminShell>
  );
}
