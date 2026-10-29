import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Folio — Understand your code",
  description: "Explore a GitHub repository or source files and ask questions about the code.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
