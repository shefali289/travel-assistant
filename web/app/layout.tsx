import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hotel recommendation assistant",
  description: "Fixture-backed demo: ask for a hotel, review recommendations, choose one.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
