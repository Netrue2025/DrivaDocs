import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      accountType: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      phone?: string | null;
    };
  }

  interface User {
    role?: string;
    accountType?: string;
    phone?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    accountType?: string;
    phone?: string | null;
    picture?: string | null;
  }
}
