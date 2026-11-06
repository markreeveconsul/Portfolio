import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProject, projects } from "@/data/projects";
import { profile } from "@/data/profile";
import { formatDate, getRepoStats, languageColor } from "@/lib/github";
import { Navbar } from "@/components/navbar";
import { ScrollReveals } from "@/components/scroll-reveals";

export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: "Project not found" };
  return { title: `${project.name} — ${profile.name}`, description: project.summary };
}

function Chapter({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return <section className="case-chapter" aria-labelledby={`chapter-${index}`}>
    <p className="case-chapter-index" data-reveal="fade">{String(index).padStart(2, "0")}</p>
    <div>
      <h2 id={`chapter-${index}`} data-reveal="lines">{title}</h2>
      <div className="case-chapter-body" data-reveal="fade">{children}</div>
    </div>
  </section>;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const position = projects.findIndex((entry) => entry.slug === project.slug);
  const next = projects[(position + 1) % projects.length];
  const study = project.caseStudy ?? {};
  const repo = project.repo ? await getRepoStats(project.repo) : null;

  // Chapters render only when written, so the page never shows filler text.
  const chapters: { title: string; body: React.ReactNode }[] = [];
  if (study.problem) chapters.push({ title: "The problem", body: <p>{study.problem}</p> });
  if (study.approach?.length) chapters.push({ title: "The approach", body: <ol className="case-steps">{study.approach.map((step) => <li key={step}>{step}</li>)}</ol> });
  chapters.push({ title: "What it does", body: <ul className="case-features">{project.features.map((feature) => <li key={feature}>{feature}</li>)}</ul> });
  if (study.outcome) chapters.push({ title: "The outcome", body: <p>{study.outcome}</p> });
  if (study.learnings?.length) chapters.push({ title: "What I learned", body: <ul className="case-features">{study.learnings.map((lesson) => <li key={lesson}>{lesson}</li>)}</ul> });

  const specs: { label: string; value: React.ReactNode }[] = [
    { label: "Status", value: <span className="case-status"><i aria-hidden="true" />{project.status}</span> },
    ...(study.role ? [{ label: "Role", value: study.role }] : []),
    ...(study.timeline ? [{ label: "Timeline", value: study.timeline }] : []),
    { label: "Type", value: project.eyebrow },
    ...(project.aiIntegrated ? [{ label: "AI", value: "Integrated" }] : []),
    ...(repo ? [{ label: "Last push", value: formatDate(repo.pushedAt) }] : []),
  ];

  return <>
    <Navbar onHome={false} />
    <main className="site-wrap case" id="main">
      <section className="case-hero">
        <Link className="back-link" href={{ pathname: "/", hash: "portfolio" }}><span aria-hidden="true">←</span> All projects</Link>
        <p className="section-index">Case study · {String(position + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</p>
        <ViewTransition name={`project-title-${project.slug}`} share="morph" default="none"><h1 className="detail-title">{project.name}</h1></ViewTransition>
        <p className="detail-summary">{project.summary}</p>
        <div className="detail-actions">
          {project.demoUrl && <a className="button button-primary" href={project.demoUrl} target="_blank" rel="noreferrer" data-magnetic="">Live demo <span aria-hidden="true">↗</span></a>}
          {project.githubUrl && <a className="button button-outline" href={project.githubUrl} target="_blank" rel="noreferrer" data-magnetic="">Source code <span aria-hidden="true">↗</span></a>}
        </div>
      </section>

      <div className="detail-visual glass-card">
        <ViewTransition name={`project-image-${project.slug}`} share="morph" default="none">
          <Image src={project.image} alt={project.imageAlt} fill sizes="(max-width: 680px) 100vw, 1200px" priority />
        </ViewTransition>
        <span className="status-badge">{project.status}</span>
      </div>

      <div className="case-body">
        <aside className="case-specs" aria-label="Project facts">
          <dl data-reveal="stagger">
            {specs.map((spec) => <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}
          </dl>
          <div className="case-stack">
            <span className="case-subhead">Stack</span>
            <div className="detail-tech">{project.technologies.map((technology) => <span className="tag" key={technology}>{technology}</span>)}</div>
          </div>
          {repo && repo.languages.length > 0 && <div className="case-languages">
            <span className="case-subhead">Code · from GitHub</span>
            <div className="gh-language-bar" aria-hidden="true">{repo.languages.map((language) => <i key={language.name} style={{ flexGrow: language.percent, background: languageColor(language.name) }} />)}</div>
            <ul>{repo.languages.slice(0, 4).map((language) => <li key={language.name}><i style={{ background: languageColor(language.name) }} aria-hidden="true" />{language.name}<span>{language.percent.toFixed(1)}%</span></li>)}</ul>
          </div>}
        </aside>

        <div className="case-chapters">
          {chapters.map((chapter, index) => <Chapter key={chapter.title} index={index + 1} title={chapter.title}>{chapter.body}</Chapter>)}
          {study.gallery?.length ? <section className="case-gallery" aria-label="Screenshots" data-reveal="stagger">
            {study.gallery.map((shot) => <figure key={shot.src} className="glass-card"><Image src={shot.src} alt={shot.alt} width={1600} height={1000} sizes="(max-width: 900px) 100vw, 760px" />{shot.caption && <figcaption>{shot.caption}</figcaption>}</figure>)}
          </section> : null}
        </div>
      </div>

      {next.slug !== project.slug && <Link className="case-next" href={`/portfolio/${next.slug}`} data-cursor="next">
        <span className="section-index">Next project</span>
        <span className="case-next-title">{next.name}<span aria-hidden="true">→</span></span>
        <span className="case-next-meta">{next.eyebrow}</span>
      </Link>}

      <footer className="footer">© {new Date().getFullYear()} {profile.name} · BUILT WITH CARE</footer>
    </main>
    <ScrollReveals />
  </>;
}
