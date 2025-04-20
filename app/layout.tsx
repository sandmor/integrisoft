import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import { NavigationProvider } from "@/components/ui/navigation-context";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Integrisoft",
  description: "Integrisoft",
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
        <ReactQueryProvider>
          <Suspense>
            <NavigationProvider>
              <NavigationProgress />
              {children}
              <Toaster />
            </NavigationProvider>
          </Suspense>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
