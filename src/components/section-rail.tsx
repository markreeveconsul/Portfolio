"use client";

import { useState } from "react";
import { ScrollTrigger, useGSAP } from "@/lib/motion";

const sections = [
  { id: "home", label: "Intro" },
  { id: "about", label: "About" },
  { id: "portfolio", label: "Work" },
  { id: "github", label: "Activity" },
  { id: "services", label: "Services" },
  { id: "contact", label: "Contact" },
];

/**
 * Live section index on the left edge (wide screens only). It duplicates the
 * navbar for pointer users, so it is hidden from assistive tech and the tab order.
 */
export function SectionRail() {
  const [active, setActive] = useState(0);

  useGSAP(() => {
    sections.forEach(({ id }, index) => {
      const element = document.getElementById(id);
      if (!element) return;
      ScrollTrigger.create({
        trigger: element,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => { if (self.isActive) setActive(index); },
      });
    });
  });

  const total = String(sections.length).padStart(2, "0");
  return <div className="section-rail" aria-hidden="true">
    <span className="section-rail-count"><b key={active}>{String(active + 1).padStart(2, "0")}</b>/{total}</span>
    <ol>
      {sections.map(({ id, label }, index) => <li key={id} className={index === active ? "is-active" : undefined}>
        <a href={`#${id}`} tabIndex={-1}><i /><span>{label}</span></a>
      </li>)}
    </ol>
  </div>;
}
