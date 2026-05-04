import Link from "next/link";
import { clsx } from "clsx";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  motion?: boolean;
};

const variants = {
  primary: "bg-brand-700 text-white hover:bg-brand-800",
  secondary: "bg-road text-ink hover:bg-road/85",
  ghost: "bg-white text-brand-800 ring-1 ring-brand-900/10 hover:bg-brand-50"
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
  motion = true
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex min-h-11 items-center justify-center rounded px-5 text-sm font-bold transition focus-ring",
        motion && "button-motion",
        variants[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}
