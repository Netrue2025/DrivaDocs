import type { Metadata } from "next";
import "./globals.css";
import { SiteChrome } from "@/components/site-chrome";

function getMetadataBase() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  try {
    return new URL(appUrl);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "DrivaDocs - Vehicle Documentation Made Easy",
  description:
    "Vehicle renewal, registration, licensing, permits, and document delivery service in Nigeria.",
  openGraph: {
    title: "DrivaDocs - Vehicle Documentation Made Easy",
    description:
      "Vehicle renewal, registration, licensing, permits, and document delivery service in Nigeria.",
    images: [
      {
        url: "/images/drivadocs-logo.png",
        width: 1200,
        height: 630,
        alt: "DrivaDocs"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "DrivaDocs - Vehicle Documentation Made Easy",
    description:
      "Vehicle renewal, registration, licensing, permits, and document delivery service in Nigeria.",
    images: ["/images/drivadocs-logo.png"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen overflow-x-hidden font-sans">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
