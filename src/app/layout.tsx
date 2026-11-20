import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FINDR - Campus Lost & Found Intelligence",
  description: "AI-assisted lost and found verification platform for university campus.",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔍</text></svg>",
        type: "image/svg+xml",
      },
    ],
    shortcut: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔍</text></svg>",
  },
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
