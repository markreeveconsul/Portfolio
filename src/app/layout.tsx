import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono, Space_Mono, Syne } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "./globals.css";
import "./visual-polish.css";

const display = Syne({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono", display: "swap" });
const cardMono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-card-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"),
  title: "Your Name — Developer Portfolio",
  description: "Selected projects, experiments, and work by a 2nd-year IT student and developer.",
  openGraph: {
    title: "Your Name — Developer Portfolio",
    description: "Selected projects and experiments in web development and AI.",
    images: [{ url: "/images/og-placeholder.svg", width: 1200, height: 630, alt: "Portfolio social preview placeholder" }],
  },
};

export const viewport: Viewport = { themeColor: "#0B0C10", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.variable} ${body.variable} ${mono.variable} ${cardMono.variable}`}><MotionConfig reducedMotion="user">{children}</MotionConfig></body></html>;
}
