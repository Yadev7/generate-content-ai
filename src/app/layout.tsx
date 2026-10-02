import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { LocalizedClerkProvider } from "./LocalizedClerkProvider";
import { Providers } from "./providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SaiGPT – AI Revision & Exam Prep for Students",
  description:
    "SaiGPT helps students revise smarter with specialist tutors for Maths, Physics, Languages, Humanities and exam quizzes. Free tier available, Sai Prime for unlimited exam prep.",
  icons: {
    icon: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh bg-background font-sans text-foreground">
        <Providers>
          <LocalizedClerkProvider>{children}</LocalizedClerkProvider>
        </Providers>
      </body>
    </html>
  );
}
