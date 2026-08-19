import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foodstories — Hourly Ads Dashboard",
  description: "Hourly Meta + Google Ads performance for Foodstories",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
