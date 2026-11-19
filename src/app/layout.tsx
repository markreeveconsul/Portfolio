import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono, Space_Mono, Syne } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { SmoothScroll } from "@/components/smooth-scroll";
import { PointerEffects } from "@/components/pointer-effects";
import { BootIntro } from "@/components/boot-intro";
import { CommandPalette } from "@/components/command-palette";
import { bootScript } from "@/lib/boot";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";
import "./visual-polish.css";
import "./motion.css";

const display = Syne({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono", display: "swap" });
const cardMono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-card-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: siteUrl,
  alternates: { canonical: "/" },
  title: "Mark Reeve Consul — Developer Portfolio",
  description: "Websites and small tools by a 2nd-year IT student from Cebu. Open to internships, collabs, and opportunities.",
  openGraph: {
    type: "website",
    siteName: "Mark Reeve Consul — Portfolio",
    url: "/",
    title: "Mark Reeve Consul — Developer Portfolio",
    description: "Websites and small tools by a 2nd-year IT student from Cebu. Open to internships, collabs, and opportunities.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Mark Reeve Consul — IT student and developer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mark Reeve Consul — Developer Portfolio",
    description: "Web apps, desktop tools, and learning projects. Open to internships, collaborations, and client work.",
    images: ["/opengraph-image"],
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
