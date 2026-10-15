import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Innovist — Good things, well chosen",
  description: "Thoughtfully made essentials for the little moments that make a day.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
