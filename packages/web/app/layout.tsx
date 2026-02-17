import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Propose Times",
  description: "Propose meeting times from your availability",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-zinc-950 text-zinc-100 antialiased">
        <main className="mx-auto max-w-md px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
