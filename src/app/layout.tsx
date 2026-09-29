import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hastrekha AI – Your palm, your path",
    template: "%s · Hastrekha AI",
  },
  description:
    "An AI palm reading rooted in Indian Samudrika Shastra. Upload your palm, get your reading, and ask the astrologer. For entertainment and self-reflection.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#7a1f2b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
