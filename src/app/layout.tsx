import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIDR Calculator",
  description: "複数の IPv4 CIDR のアドレス範囲と重なりを比較する計算機",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}
