import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "SSIM Sync | Campus Discovery",
  description: "A private, verified social discovery platform for SSIM students.",
};

import Navigation from "@/components/Navigation";
import AccessGuard from "@/components/AccessGuard";
import BroadcastBanner from "@/components/BroadcastBanner";
import PushInitializer from "@/components/PushInitializer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-midnight text-foreground">
        <AccessGuard />
        <PushInitializer />
        <BroadcastBanner />
        <Navigation />
        <main className="flex-1 pb-24 md:pb-0 md:pt-20">
          {children}
        </main>
      </body>
    </html>
  );
}
