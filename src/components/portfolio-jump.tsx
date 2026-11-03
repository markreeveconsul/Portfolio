"use client";

import type { PropsWithChildren } from "react";

export function PortfolioJump({ tab, children, className = "" }: PropsWithChildren<{ tab: "projects" | "certificates" | "tech"; className?: string }>) {
  return <a className={className} href="#portfolio" onClick={() => window.dispatchEvent(new CustomEvent("portfolio-tab", { detail: tab }))}>{children}</a>;
}
