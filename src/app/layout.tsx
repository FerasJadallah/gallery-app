import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";

import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAlert } from "@/hooks/use-alert";
import { AlertBanner } from "@/components/ui/alert-banner";
import { GlobalAlert } from "@/components/ui/global-alert";




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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ToastProvider>
            <GlobalAlert />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
