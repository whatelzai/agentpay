import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentPay — The trust layer that makes AI spend safely",
  description:
    "Cryptographic confirmation binding for AI-agent payments. Cards handle credential theft. AgentPay closes the prompt-injection gap the card layer alone cannot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
