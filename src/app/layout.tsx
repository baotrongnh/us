import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ours. — a little place for us",
  description: "A private space for the moments you share.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
