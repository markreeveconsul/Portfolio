import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProject, projects } from "@/data/projects";

export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: "Project not found" };
  return { title: `${project.name} — Portfolio`, description: project.summary };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return <main className="site-wrap">
    <section className="detail-hero">
      <Link className="back-link" href="/#portfolio">← Back to portfolio</Link>
      <p className="eyebrow"><span className="accent">//</span> {project.eyebrow}</p>
      <h1 className="detail-title">{project.name}</h1>
      <p className="detail-summary">{project.summary}</p>
      <div className="detail-actions">
        {project.demoUrl && <a className="button button-primary" href={project.demoUrl} target="_blank" rel="noreferrer">Live demo ↗</a>}
        {project.githubUrl && <a className="button button-outline" href={project.githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>}
        <span className="status-badge">{project.status}</span>
      </div>
      <div className="detail-visual glass-card"><Image src={project.image} alt={project.imageAlt} fill sizes="(max-width: 680px) 100vw, 1160px" priority /></div>
      <div className="detail-content-grid">
        <section className="detail-panel glass-card"><h2>About this project</h2><p>{project.description}</p><p><strong>My contribution:</strong> Details will be added when the project walkthrough is ready.</p></section>
        <section className="detail-panel glass-card"><h2>Key features</h2><ul>{project.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></section>
        <section className="detail-panel glass-card"><h2>Technologies used</h2><div className="detail-tech">{project.technologies.map((technology) => <span className="tag" key={technology}>{technology}</span>)}</div></section>
        <section className="detail-panel glass-card"><h2>Project notes</h2><p>Status: {project.status}. Screenshots, walkthroughs, and verified links can be added as they are ready to share.</p></section>
      </div>
      <Link className="back-link" href="/#portfolio">← Back to all projects</Link>
    </section>
    <footer className="footer">© {new Date().getFullYear()} [YOUR NAME] · BUILT WITH CARE</footer>
  </main>;
}
