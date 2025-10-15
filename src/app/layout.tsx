import type { Metadata } from "next";
import { Geist, Geist_Mono, Golos_Text } from "next/font/google";
import "./globals.css";
import PageTransition from "@/components/PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const golosText = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "onPort — Build and share crypto portfolios",
  description: "Build portfolios of any kind with onPort. Create and share Solana memecoin portfolios with live prices.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${golosText.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PageTransition>
          {children}
        </PageTransition>
      </body>
    </html>
  );
}
