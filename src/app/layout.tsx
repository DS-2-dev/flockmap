import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALPR Atlas",
  description: "Every known Flock license-plate camera in the US, and which ones are on your route.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Adobe Fonts kit: t26-carbon (titles), host-grotesk (text). */}
        <link rel="stylesheet" href="https://use.typekit.net/yrs7pes.css" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
