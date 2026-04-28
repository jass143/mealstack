import "@/styles/globals.css";
import { ReactNode } from "react";
import { Inter } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "MealStack",
  description: "Multi-tenant restaurant management SaaS",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <SessionProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
