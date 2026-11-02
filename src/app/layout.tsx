import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ViraWatch AI — Which diseases are peaking right now",
  description:
    "A live disease activity tracker. Combines WHO and CDC data, global news and public interest, with an AI briefing that cites its sources.",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
