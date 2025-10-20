import type { Metadata } from "next";
import { Geist, Geist_Mono, Golos_Text } from "next/font/google";
import "./globals.css";
import PageTransition from "@/components/PageTransition";
import BottomBar from "@/components/BottomBar";
import ClientBody from "@/components/ClientBody";
import PrivyProvider from "@/components/PrivyProvider";

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
  title: "onPort — Build your bags and shill it to the world!",
  description: "Build bags with onPort, from Solana to BNB. The world is waiting for you to shill your bags",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="shortcut icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Disable right-click context menu
              document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                return false;
              });
              
              // Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, Ctrl+A, Ctrl+P
              document.addEventListener('keydown', function(e) {
                if (e.key === 'F12' || 
                    (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                    (e.ctrlKey && e.key === 'u') ||
                    (e.ctrlKey && e.key === 's') ||
                    (e.ctrlKey && e.key === 'a') ||
                    (e.ctrlKey && e.key === 'p')) {
                  e.preventDefault();
                  return false;
                }
              });
            `,
          }}
        />
      </head>
      <ClientBody className={`${golosText.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PrivyProvider>
          <PageTransition>
            {children}
            <BottomBar />
          </PageTransition>
        </PrivyProvider>
      </ClientBody>
    </html>
  );
}
