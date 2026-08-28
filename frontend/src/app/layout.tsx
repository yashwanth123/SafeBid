import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";
import { DemoBanner } from "@/components/DemoBanner";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "SafeBid — verified neighbors, protected payments",
  description:
    "A hyperlocal community feed and services marketplace with ID verification and escrow.",
  applicationName: "SafeBid",
  appleWebApp: {
    capable: true,
    title: "SafeBid",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#1B4332",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${fraunces.variable} font-sans antialiased`}>
        <Providers>
          <DemoBanner />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
