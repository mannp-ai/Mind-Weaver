"use client";

import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AuthProvider } from "@/hooks/use-auth";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import MainLayout from "@/components/main-layout";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

// This metadata is not being used due to 'use client', but we'll fix this structure.
// Note: Metadata can't be exported from a client component. 
// We will address this by moving client-specific logic.
/*
export const metadata: Metadata = {
  title: "Mind Weaver",
  description: "A private library of the mind for self-discovery.",
};
*/

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Mind Weaver</title>
        <meta name="description" content="A private library of the mind for self-discovery." />
      </head>
      <body className={`${poppins.variable} font-body antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SidebarProvider>
              <MainLayout>{children}</MainLayout>
              <Toaster />
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
