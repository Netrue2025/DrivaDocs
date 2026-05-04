import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          accountType: user.accountType,
          phone: user.phone
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.accountType = (user as { accountType?: string }).accountType;
        token.phone = (user as { phone?: string | null }).phone;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const latestUser = token.id
          ? await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { id: true, name: true, email: true, image: true, phone: true, role: true, accountType: true }
            }).catch(() => null)
          : null;
        session.user.id = (latestUser?.id || token.id) as string;
        session.user.name = latestUser?.name ?? session.user.name;
        session.user.email = latestUser?.email ?? session.user.email;
        session.user.image = latestUser?.image ?? (token.picture as string | null | undefined) ?? session.user.image;
        session.user.phone = latestUser?.phone ?? (token.phone as string | null | undefined);
        session.user.role = latestUser?.role || (token.role as string);
        session.user.accountType = latestUser?.accountType || (token.accountType as string);
      }
      return session;
    }
  }
};
