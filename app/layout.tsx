import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SigningRequestsProvider } from "./context/signing-requests";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cambamatic Reprocessor",
  description: "Diagnóstico y reproceso de solicitudes de firma de créditos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: extensiones del navegador (p. ej. ColorZilla) inyectan atributos en <body> antes de hidratar. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SigningRequestsProvider>{children}</SigningRequestsProvider>
      </body>
    </html>
  );
}
