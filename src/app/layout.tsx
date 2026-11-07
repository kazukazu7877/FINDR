import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FINDR - Campus Lost & Found Intelligence",
  description: "AI-assisted lost and found verification platform for university campus.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#0d0a1a] text-[#f0eef5]">
        {children}
      </body>
    </html>
  );
}
