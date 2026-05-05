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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Inter:wght@200;400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen overflow-x-hidden font-sans">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
