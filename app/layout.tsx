import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scout Registration Management System",
  description: "Registration, payment, dashboard, and audit management system."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
