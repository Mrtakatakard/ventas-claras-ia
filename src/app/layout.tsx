import type { Metadata } from "next";
import { PT_Sans } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "@/components/toaster-provider";

const ptSans = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Ventas Claras",
  description: "Un CRM amigable para gestionar tus ventas y clientes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${ptSans.variable} font-sans antialiased`}>
        <ToasterProvider>{children}</ToasterProvider>
      </body>
    </html>
  );
}
