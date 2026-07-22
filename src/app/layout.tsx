import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aircraft Producer",
  description: "A deterministic aircraft manufacturing tycoon game."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
