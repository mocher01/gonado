import type { Metadata } from "next";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const ClientProviders = dynamic(() => import("@/components/ClientProviders").then(mod => ({ default: mod.ClientProviders })), {
  ssr: false,
  loading: () => null,
});

export const metadata: Metadata = {
  title: "Gonado - Achieve Your Goals",
  description: "Goal achievement platform with AI-powered planning and community support",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gonado",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ClientProviders />
        {children}
      </body>
    </html>
  );
}
