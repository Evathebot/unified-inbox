import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Inbox - Unified Communications",
  description: "Your intelligent unified inbox across all communication platforms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased bg-gray-50 text-gray-900`}>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar - narrow icon bar */}
          <div className="hidden md:block shrink-0">
            <Sidebar />
          </div>

          {/* Main content area */}
          <main className="flex-1 overflow-auto bg-gray-50 relative">
            <div className="absolute top-3 right-4 z-50 text-[11px] font-mono text-gray-400 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-md border border-gray-100">
              v0.1.0
            </div>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
