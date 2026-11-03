"use client";

import { useEffect, useRef, useState } from "react";
import { profile } from "@/data/profile";

const links = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#services", label: "Services" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  const [active, setActive] = useState("home");
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuLinksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = links.map(({ href }) => document.querySelector(href)).filter((section): section is Element => Boolean(section));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActive(visible.target.id);
    }, { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.1, 0.25, 0.5] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

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

  return <div className="navbar-wrap"><nav className="navbar" aria-label="Main navigation">
    <a className="logo" href="#home" aria-label={`${profile.firstName}, home`}>{profile.firstName.toLowerCase().replaceAll(" ", "")}.dev<span>_</span></a>
    <div ref={menuLinksRef} id="main-menu" className={`nav-links${open ? " open" : ""}`}>
      {links.map(({ href, label }) => <a key={href} className={`nav-link${active === href.slice(1) ? " active" : ""}`} href={href} aria-current={active === href.slice(1) ? "location" : undefined} onClick={() => setOpen(false)}>{label}</a>)}
    </div>
    <a className="button quote-link" href="#contact">Get a quote <span aria-hidden="true">↗</span></a>
    <button ref={menuButtonRef} className="menu-toggle" type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="main-menu" onClick={() => setOpen((value) => !value)}>{open ? "×" : "☰"}</button>
  </nav></div>;
}
