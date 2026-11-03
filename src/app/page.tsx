import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { HeroIdCard } from "@/components/hero-id-card";
import { PortfolioExplorer } from "@/components/portfolio-explorer";
import { ContactForm } from "@/components/contact-form";
import { MotionSection } from "@/components/motion-section";
import { PortfolioJump } from "@/components/portfolio-jump";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";
import { services } from "@/data/services";
import { certificates } from "@/data/certificates";

export default function HomePage() {
  const completedProjects = projects.filter((project) => project.status === "Completed").length;
  return <>
    <a className="sr-only focus:not-sr-only" href="#main">Skip to content</a>
    <Navbar />
    <main id="main" className="site-wrap">
      <section className="hero" id="home" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="availability"><i aria-hidden="true" />{profile.status}</p>
          <h1 id="hero-title">{profile.roleLineOne}<br /><span>{profile.roleLineTwo}</span></h1>
          <p className="cursor-line">2ND-YEAR IT STUDENT&nbsp; · &nbsp;DEVELOPER</p>
          <p className="hero-description">{profile.bio}</p>
          <div className="tech-chips" aria-label="Selected technologies"><span className="chip">Java</span><span className="chip">JavaFX</span><span className="chip">AI projects</span><span className="chip">Web apps</span></div>
          <div className="hero-actions"><a className="button button-primary" href="#portfolio">See my projects <span aria-hidden="true">↘</span></a><a className="button button-outline" href="#contact">Hire me <span aria-hidden="true">↗</span></a></div>
        </div>
                <HeroIdCard />
        <div className="hero-scroll" aria-hidden="true"><span>SCROLL TO EXPLORE</span><span className="scroll-arrow">↓</span><span>01 — 04</span></div>
      </section>

      <MotionSection className="section" >
        <div className="about-grid" id="about">
          <div className="about-copy"><p className="eyebrow"><span className="accent">//</span> About me</p><h2>{profile.name}</h2><p>{profile.bio}</p>{profile.quote && <blockquote className="about-quote">“{profile.quote}”</blockquote>}<div className="about-buttons"><button className="button button-primary" type="button" disabled>Download CV <span aria-hidden="true">↓</span></button><a className="button button-outline" href="#portfolio">View projects <span aria-hidden="true">↘</span></a></div></div>
          <div className="profile-side"><div className="portrait-ring"><Image src="/images/profile-placeholder.svg" alt="Profile portrait placeholder" width={640} height={640} /></div><div className="stats">
            <PortfolioJump tab="projects" className="stat-card glass-card"><span className="stat-number">{String(projects.length).padStart(2, "0")}</span><span className="stat-label">Projects</span></PortfolioJump>
            <PortfolioJump tab="certificates" className="stat-card glass-card"><span className="stat-number">{certificates.length ? String(certificates.length).padStart(2, "0") : "—"}</span><span className="stat-label">Certificates</span></PortfolioJump>
            <PortfolioJump tab="projects" className="stat-card glass-card"><span className="stat-number">{String(completedProjects).padStart(2, "0")}</span><span className="stat-label">Completed works</span></PortfolioJump>
          </div></div>
        </div>
      </MotionSection>

      <MotionSection className="section portfolio-section" id="portfolio">
        <div className="section-heading"><p className="eyebrow"><span className="accent">//</span> Portfolio</p><h2>Selected work &<br />curious experiments.</h2><p>A few projects I’ve worked on. AI integrations are called out so their role is easy to spot.</p></div>
        <PortfolioExplorer />
      </MotionSection>

      <MotionSection className="section" id="services">
        <div className="section-heading"><p className="eyebrow"><span className="accent">//</span> Services</p><h2>Ways I can help.</h2><p>I am exploring these project types and will confirm each service as the portfolio develops.</p></div>
        <div className="services-grid">{services.map((service) => <article className="service-card glass-card" key={service.number}><span className="service-num">{service.number} / SERVICE</span><h3>{service.title}</h3><p>{service.description}</p></article>)}</div>
        <div className="process-row glass-card" aria-label="How I work"><span className="process-step"><b>01</b> Talk</span><span className="process-step"><b>02</b> Design</span><span className="process-step"><b>03</b> Build</span><span className="process-step"><b>04</b> Revise</span><span className="process-step"><b>05</b> Deliver</span></div>
      </MotionSection>

      <MotionSection className="section" id="contact">
        <div className="section-heading"><p className="eyebrow"><span className="accent">//</span> Contact</p><h2>Let’s build something<br />worth sharing.</h2><p>Have a project, opportunity, or collaboration in mind? Send a note.</p></div>
        <div className="contact-grid">
          <section className="contact-panel glass-card" id="contact-form"><h3>Send a message</h3><p>The contact form is not connected yet. It will be ready once the portfolio contact details are set up.</p><ContactForm /></section>
          <section className="contact-panel glass-card"><h3>Connect with me</h3><p>Public contact links will be added here.</p><div className="social-list">
            {profile.github.startsWith("https://") ? <a className="social-link" href={profile.github} target="_blank" rel="noreferrer"><span>GitHub</span><span>↗</span></a> : <div className="social-link social-link-placeholder" aria-disabled="true"><span>GitHub</span><span>Link coming soon</span></div>}
            {profile.linkedin.startsWith("https://") ? <a className="social-link" href={profile.linkedin} target="_blank" rel="noreferrer"><span>LinkedIn</span><span>↗</span></a> : <div className="social-link social-link-placeholder" aria-disabled="true"><span>LinkedIn</span><span>Link coming soon</span></div>}
            {profile.email.includes("@") ? <a className="social-link" href={`mailto:${profile.email}`}><span>Email</span><span>↗</span></a> : <div className="social-link social-link-placeholder" aria-disabled="true"><span>Email</span><span>Address coming soon</span></div>}
          </div></section>
        </div>
      </MotionSection>
      <footer className="footer">© {new Date().getFullYear()} {profile.name} · BUILT WITH CARE</footer>
    </main>
  </>;
}
