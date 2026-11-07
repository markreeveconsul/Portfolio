import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono, Space_Mono, Syne } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { SmoothScroll } from "@/components/smooth-scroll";
import { PointerEffects } from "@/components/pointer-effects";
import { BootIntro } from "@/components/boot-intro";
import { CommandPalette } from "@/components/command-palette";
import { bootScript } from "@/lib/boot";
import "./globals.css";
import "./visual-polish.css";
import "./motion.css";

const display = Syne({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono", display: "swap" });
const cardMono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-card-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"),
  title: "Mark Reeve Consul — Developer Portfolio",
  description: "Websites and small tools by a 2nd-year IT student from Cebu. Open to internships, collabs, and opportunities.",
  openGraph: {
    title: "Mark Reeve Consul — Developer Portfolio",
    description: "Websites and small tools by a 2nd-year IT student from Cebu. Open to internships, collabs, and opportunities.",
    images: [{ url: "/images/og-placeholder.svg", width: 1200, height: 630, alt: "Portfolio social preview placeholder" }],
  },
};

export const viewport: Viewport = { themeColor: "#0B0C10", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // suppressHydrationWarning: the pre-paint boot script sets data-boot on <html> before React hydrates.
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: bootScript }} /></head><body className={`${display.variable} ${body.variable} ${mono.variable} ${cardMono.variable}`}>
    <BootIntro />
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
    <SmoothScroll />
    <PointerEffects />
    <CommandPalette />
    <div className="grain" aria-hidden="true" />
  </body></html>;
}
