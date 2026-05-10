import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProfileForm } from "@/components/profile-form";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, image: true }
  });

  return (
    <div className="max-w-2xl">
      <ProfileForm
        profile={{
          name: user?.name || "",
          email: user?.email || session.user.email || "",
          phone: user?.phone || "",
          image: user?.image || null
        }}
      />
    </div>
  );
}
