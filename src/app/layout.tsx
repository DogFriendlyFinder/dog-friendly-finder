import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { JsonLd } from "@/lib/schema/components/JsonLd";
import { generateOrganizationSchema } from "@/lib/schema/global/organization";
import { generateWebSiteSchema } from "@/lib/schema/global/website";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dog Friendly Finder | UK's Best Dog-Friendly Restaurants, Hotels & Attractions",
  description: "Discover verified dog-friendly restaurants, hotels, and attractions across the UK. Detailed information on facilities, restrictions, and amenities for your four-legged friend.",
  keywords: "dog friendly restaurants UK, dog friendly hotels UK, dog friendly places, restaurants that allow dogs, pet friendly dining",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Generate global schemas (appear on every page)
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();

  return (
    <html lang="en-GB">
      <head>
        {/* Global Organization & WebSite Schemas */}
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
