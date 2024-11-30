import type { Metadata } from "next";

import "./globals.css";
import { Providers } from './providers'
import Footer from "@/components/footer";


 

export const metadata: Metadata = {
  title: "AI Smartest Chat",
  description: "This is an AI powered chat bot, based on Gemini API , which can answer any question related to AI.",
  icons: {
    icon: "/logo.png",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      
    <body className="flex flex-col min-h-screen bg-background text-foreground">
 <h1>Clerk</h1>
      <Providers>
        {children}
        
      <Footer />
      </Providers>
    </body>
  </html>
  );
}
