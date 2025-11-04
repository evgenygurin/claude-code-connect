import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boss Agent Dashboard",
  description: "AI-powered development coordinator dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
