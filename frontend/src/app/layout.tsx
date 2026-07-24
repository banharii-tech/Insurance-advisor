import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "ClearCover | Fictional Insurance Planning Prototype",
  description:
    "A private, transparent learning prototype for comparing fictional Singapore insurance plan categories.",
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
