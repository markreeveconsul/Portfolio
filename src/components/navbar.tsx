"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { profile } from "@/data/profile";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion";

const links = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "portfolio", label: "Portfolio" },
  { id: "services", label: "Services" },
  { id: "contact", label: "Contact" },
];

/**
 * @param onHome true on the one-page home route (links are in-page anchors);
 *               false on other routes (links go back to the home page sections).
 */
export function Navbar({ onHome = true }: { onHome?: boolean }) {
  const [active, setActive] = useState(onHome ? "home" : "");
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuLinksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onHome) return;
    const sections = links.map(({ id }) => document.getElementById(id)).filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActive(visible.target.id);
    }, { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.1, 0.25, 0.5] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [onHome]);

  useGSAP(() => {
    const nav = navRef.current;
    if (!nav) return;
    ScrollTrigger.create({ start: 80, end: "max", toggleClass: { targets: nav, className: "is-compact" } });
    if (progressRef.current) gsap.fromTo(progressRef.current, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
  });

  useEffect(() => {
    if (open) menuLinksRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const logo = <>{profile.domain}<span>_</span></>;

  return <div className="navbar-wrap"><nav ref={navRef} className="navbar" aria-label="Main navigation">
    {onHome ? <a className="logo" href="#home" aria-label={`${profile.firstName}, home`}>{logo}</a> : <Link className="logo" href="/" aria-label={`${profile.firstName}, home`}>{logo}</Link>}
    <div ref={menuLinksRef} id="main-menu" className={`nav-links${open ? " open" : ""}`}>
      {links.map(({ id, label }) => {
        const isActive = active === id;
        const content = <>{isActive && <motion.span className="nav-indicator" layoutId="nav-indicator" transition={{ type: "spring", stiffness: 380, damping: 32 }} aria-hidden="true" />}<span className="nav-link-label">{label}</span></>;
        const shared = { className: `nav-link${isActive ? " active" : ""}`, "aria-current": isActive ? ("location" as const) : undefined, onClick: () => setOpen(false) };
        return onHome
          ? <a key={id} href={`#${id}`} {...shared}>{content}</a>
          : <Link key={id} href={{ pathname: "/", hash: id }} {...shared}>{content}</Link>;
      })}
    </div>
    {onHome
      ? <a className="button quote-link" href="#contact" data-magnetic="">Get a quote <span aria-hidden="true">↗</span></a>
      : <Link className="button quote-link" href={{ pathname: "/", hash: "contact" }} data-magnetic="">Get a quote <span aria-hidden="true">↗</span></Link>}
    <button ref={menuButtonRef} className="menu-toggle" type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="main-menu" onClick={() => setOpen((value) => !value)}><span className={`menu-icon${open ? " is-open" : ""}`} aria-hidden="true"><i /><i /></span></button>
    <span ref={progressRef} className="nav-progress" aria-hidden="true" />
  </nav></div>;
}
