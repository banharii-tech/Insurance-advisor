import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "ClearCover | Insurance Planning Demo",
  description:
    "A transparent demo platform for comparing fictional Singapore insurance plan categories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
