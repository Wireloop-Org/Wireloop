import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wireloop — Contribution-gated collaboration for open source",
  description: "Real-time coordination loops for open-source repositories, gated by verified GitHub contributions. Built for maintainers and the people who ship with them.",
  openGraph: {
    title: "Wireloop",
    description: "Contribution-gated collaboration for open source.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-white text-zinc-950`}
      >
        {children}
      </body>
    </html>
  );
}
