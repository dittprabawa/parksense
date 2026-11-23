import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AccountGate } from "@/components/account-gate";

export const metadata: Metadata = {
  title: "ParkSense",
  applicationName: "ParkSense",
  description: "Keep track of where you parked.",
  appleWebApp: {
    capable: true,
    title: "ParkSense",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><AccountGate>{children}</AccountGate></body>
    </html>
  );
}
