import { NavbarClient } from "@/components/navbar-client";

const navItems = [
  { href: "/pricing", label: "Pricing" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/contact", label: "Contact" },
  { href: "/dashboard", label: "Dashboard" }
];

export function Navbar() {
  return <NavbarClient navItems={navItems} />;
}
