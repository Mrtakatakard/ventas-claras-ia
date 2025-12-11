import type { Metadata } from "next";
import { PT_Sans } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "@/components/toaster-provider";
import Providers from "./providers";

const ptSans = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Ventas Claras",
  description: "Un CRM amigable para gestionar tus ventas y clientes.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${ptSans.variable} font-sans antialiased`}>
        <Providers>
          <ToasterProvider>{children}</ToasterProvider>
        </Providers>
      </body>
    </html>
  );
}
