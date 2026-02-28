import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { APP_VERSION } from "@/lib/version";

// Ensure the layout (and all nested routes) are always server-rendered
// fresh so DB data is never served from a stale build-time cache.
export const dynamic = 'force-dynamic';

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
      {/* Apply saved dark mode preference before first paint to prevent flash */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();` }} />
      </head>
      <body className={`${geistSans.variable} antialiased bg-gray-50 text-gray-900`}>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar - narrow icon bar */}
          <div className="hidden md:block shrink-0">
            <Sidebar />
          </div>

          {/* Main content area */}
          <main className="flex-1 overflow-auto bg-gray-50 relative pb-16 md:pb-0">
            <div className="absolute top-3 right-4 z-50 text-[11px] font-mono text-gray-400 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-md border border-gray-100">
              {APP_VERSION}
            </div>
            {children}
          </main>

          {/* Mobile bottom tab bar */}
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
