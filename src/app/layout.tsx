import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";

import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAlert } from "@/hooks/use-alert";
import { AlertBanner } from "@/components/ui/alert-banner";
import { GlobalAlert } from "@/components/ui/global-alert";
import NavBar from "@/components/ui/NavBar";




const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gallery App",
  description: "A Supabase-powered gallery for sharing albums and images.",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative min-h-screen app-bg`}
      >
        <AuthProvider>
          <ToastProvider>
            <div className="pointer-events-none fixed inset-0 bg-white/60" aria-hidden="true" />
            <div className="relative z-10">
              <NavBar />
              <GlobalAlert />
              {children}
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
