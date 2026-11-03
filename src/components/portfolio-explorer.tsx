"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { certificates } from "@/data/certificates";
import { projects } from "@/data/projects";
import { techStack } from "@/data/techstack";

type TabKey = "projects" | "certificates" | "tech";
const tabs: { id: TabKey; label: string }[] = [
  { id: "projects", label: "Projects" },
  { id: "certificates", label: "Certificates" },
  { id: "tech", label: "Tech Stack" },
];

export function PortfolioExplorer() {
  const [active, setActive] = useState<TabKey>("projects");
  const [certificateIndex, setCertificateIndex] = useState<number | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const certificateTriggerRef = useRef<HTMLButtonElement | null>(null);

  const closeLightbox = useCallback(() => {
    setCertificateIndex(null);
    requestAnimationFrame(() => certificateTriggerRef.current?.focus());
  }, []);
  const moveLightbox = useCallback((delta: number) => {
    setCertificateIndex((current) => current === null || certificates.length === 0 ? current : (current + delta + certificates.length) % certificates.length);
  }, []);

  useEffect(() => {
    if (certificateIndex === null) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent | globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowRight") moveLightbox(1);
      if (event.key === "ArrowLeft") moveLightbox(-1);
      if (event.key === "Tab") {
        const dialog = document.querySelector<HTMLElement>("[role='dialog']");
        const focusable = dialog?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [certificateIndex, closeLightbox, moveLightbox]);

  useEffect(() => {
    const selectTab = (event: Event) => {
      const detail = (event as CustomEvent<TabKey>).detail;
      if (tabs.some((tab) => tab.id === detail)) setActive(detail);
    };
    window.addEventListener("portfolio-tab", selectTab);
    return () => window.removeEventListener("portfolio-tab", selectTab);
  }, []);

  function handleTabKey(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.id === active);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    setActive(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return <>
    <div className="tablist" role="tablist" aria-label="Portfolio categories" onKeyDown={handleTabKey}>
      {tabs.map((tab, index) => <button key={tab.id} ref={(node) => { tabRefs.current[index] = node; }} id={`tab-${tab.id}`} className="tab" type="button" role="tab" aria-selected={active === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={active === tab.id ? 0 : -1} onClick={() => setActive(tab.id)}>{tab.label}</button>)}
    </div>
    <div id={`panel-${active}`} role="tabpanel" aria-labelledby={`tab-${active}`} tabIndex={0}>
      {active === "projects" && <div className="project-grid">
        {projects.map((project) => <article className="project-card glass-card" key={project.slug}>
          <Link className="project-image" href={`/portfolio/${project.slug}`} aria-label={`View details for ${project.name}`}>
            <Image src={project.image} alt={project.imageAlt} fill sizes="(max-width: 680px) 100vw, (max-width: 900px) 50vw, 33vw" />
            <span className="status-badge">{project.status}</span>
          </Link>
          <div className="project-content">
            <span className="project-meta">{project.aiIntegrated ? "AI INTEGRATION" : project.eyebrow}</span>
            <h3>{project.name}</h3>
            <p>{project.summary}</p>
            <div className="tag-list">{project.technologies.slice(0, 3).map((tech) => <span className="tag" key={tech}>{tech}</span>)}</div>
            <Link className="details-link" href={`/portfolio/${project.slug}`}>Details <span aria-hidden="true">↗</span></Link>
          </div>
        </article>)}
      </div>}
      {active === "certificates" && (certificates.length > 0 ? <div className="certificate-grid">{certificates.map((certificate, index) => <button className="certificate-card" key={`${certificate.title}-${index}`} type="button" onClick={(event) => { certificateTriggerRef.current = event.currentTarget; setCertificateIndex(index); }} aria-label={`Open certificate: ${certificate.title}`}><Image src={certificate.image} alt={certificate.imageAlt} width={640} height={420} /><span>{certificate.title} · {certificate.issuer}</span></button>)}</div> : <div className="empty-state glass-card"><strong>Certificates will go here.</strong>Add certificate details and image paths in <code>src/data/certificates.ts</code> when you’re ready.</div>)}
      {active === "tech" && <div className="tech-groups">{techStack.map((group) => <section className="tech-group glass-card" key={group.name}><h3>{group.name}</h3><div className="tech-group-items">{group.items.map((item) => <span className="tech-item" key={item}>{item}</span>)}</div></section>)}</div>}
    </div>
    {certificateIndex !== null && certificates[certificateIndex] && <div className="lightbox" onMouseDown={(event) => { if (event.target === event.currentTarget) closeLightbox(); }}>
      <div className="lightbox-dialog glass-card" role="dialog" aria-modal="true" aria-label={`Certificate: ${certificates[certificateIndex].title}`}>
        <button className="lightbox-close" type="button" aria-label="Close certificate viewer" ref={closeRef} onClick={closeLightbox}>×</button>
        {certificates.length > 1 && <><button className="lightbox-nav lightbox-prev" type="button" aria-label="Previous certificate" onClick={() => moveLightbox(-1)}>←</button><button className="lightbox-nav lightbox-next" type="button" aria-label="Next certificate" onClick={() => moveLightbox(1)}>→</button></>}
        <Image src={certificates[certificateIndex].image} alt={certificates[certificateIndex].imageAlt} width={1200} height={800} />
        <div className="lightbox-caption">{certificates[certificateIndex].title} · {certificates[certificateIndex].issuer} · {certificates[certificateIndex].date}</div>
      </div>
    </div>}
  </>;
}
