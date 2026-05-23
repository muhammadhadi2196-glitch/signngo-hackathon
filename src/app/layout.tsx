import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: "signNGO — Sign documents. Send invoices. Get paid.",
  description:
    "The fast, simple way to send signable documents and professional invoices. Built for small businesses.",
  openGraph: {
    title: "signNGO — Sign documents. Send invoices. Get paid.",
    description:
      "The fast, simple way to send signable documents and professional invoices. Built for small businesses.",
    url: "/",
    siteName: "signNGO",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "signNGO",
    description: "Sign documents. Send invoices. Get paid.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
