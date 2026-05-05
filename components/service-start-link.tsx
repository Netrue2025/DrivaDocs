"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export function ServiceStartLink({
  href,
  children,
  className
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { status } = useSession();
  const targetHref = status === "authenticated"
    ? href
    : `/login?callbackUrl=${encodeURIComponent(href)}`;

  return (
    <Link href={targetHref} className={className}>
      {children}
    </Link>
  );
}
