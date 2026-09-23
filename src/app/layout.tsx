import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIDR Calculator",
  description: "Calculate and compare address ranges and overlaps across multiple CIDRs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
