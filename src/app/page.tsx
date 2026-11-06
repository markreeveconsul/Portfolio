import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { HeroIdCard } from "@/components/hero-id-card";
import { HeroHeadline } from "@/components/hero-headline";
import { HeroMotion } from "@/components/hero-motion";
import { PortfolioExplorer } from "@/components/portfolio-explorer";
import { PortfolioJump } from "@/components/portfolio-jump";
import { ScrollReveals } from "@/components/scroll-reveals";
import { SectionRail } from "@/components/section-rail";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";
import { services } from "@/data/services";
import { certificates } from "@/data/certificates";
import { techStackItems } from "@/data/techstack";
import { ChatMascot } from "@/components/chat-mascot";
import { GithubActivity } from "@/components/github-activity";
import { NetworkField } from "@/components/network-field";
import { ArchWordmark } from "@/components/arch-wordmark";

const processSteps = ["Talk", "Design", "Build", "Revise", "Deliver"];

function Marquee() {
  // Two identical copies so translateX(-50%) loops without a seam.
  const row = (copy: string) => techStackItems.map((item, index) => <span className={`marquee-item${index % 3 === 0 ? " is-solid" : ""}`} key={`${copy}-${item}`}>{item}<i>✦</i></span>);
  return <div className="marquee" aria-hidden="true">
    <div className="marquee-track">{row("a")}{row("b")}</div>
  </div>;
}

export default function HomePage() {
  const completedProjects = projects.filter((project) => project.status === "Completed").length;
  const statValue = (count: number) => (count ? String(count).padStart(2, "0") : "—");
  return <>
    <a className="sr-only focus:not-sr-only" href="#main">Skip to content</a>
    <Navbar />
    {/* Constellation behind the whole page (fixed, drifts with scroll, reacts to the cursor). */}
    <div className="site-field" aria-hidden="true"><NetworkField parallax /></div>
    <main id="main" className="site-wrap">
      <section className="hero" id="home" aria-labelledby="hero-title">
        <HeroMotion />
        <div className="hero-copy">
          <p className="availability" data-hero-reveal=""><i aria-hidden="true" />{profile.status}</p>
          <HeroHeadline lineOne={profile.roleLineOne} lineTwo={profile.roleLineTwo} />
          <p className="cursor-line" data-hero-reveal="">2ND-YEAR IT STUDENT&nbsp; · &nbsp;DEVELOPER</p>
          <p className="hero-description" data-hero-reveal="">{profile.bio}</p>
          <div className="tech-chips" aria-label="Selected technologies" data-hero-reveal=""><span className="chip">Research projects</span><span className="chip">Capstone projects</span><span className="chip">AI projects</span><span className="chip">Web apps</span></div>
          <div className="hero-actions" data-hero-reveal=""><a className="button button-primary" href="#portfolio" data-magnetic="">See my projects <span aria-hidden="true">↘</span></a><a className="button button-outline" href="#contact" data-magnetic="">Hire me <span aria-hidden="true">↗</span></a></div>
        </div>
        <div className="hero-card-shell"><HeroIdCard /></div>
        <div className="hero-scroll" aria-hidden="true"><span>SCROLL TO EXPLORE</span><span className="scroll-arrow">↓</span></div>
      </section>

      <Marquee />

      <section className="section" id="about">
        <div className="about-grid">
          <div className="about-copy"><p className="section-index" data-reveal="fade">02 / About</p><h2 data-reveal="lines">{profile.name}</h2><p data-reveal="fade">{profile.bio}</p>{profile.quote && <blockquote className="about-quote" data-reveal="fade">“{profile.quote}”</blockquote>}<div className="about-buttons" data-reveal="fade"><a className="button button-outline" href="#portfolio" data-magnetic="">Explore my work <span aria-hidden="true">↘</span></a></div></div>
          <div className="profile-side" data-reveal="stagger"><div className="portrait-ring"><Image src="/images/about%20pic.jpg" alt="Portrait of Mark Reeve Consul" width={640} height={640} /></div><div className="stats">
            <PortfolioJump tab="projects" className="stat-card glass-card"><span className="stat-number" data-count={projects.length}>{statValue(projects.length)}</span><span className="stat-label">Projects</span></PortfolioJump>
            <PortfolioJump tab="certificates" className="stat-card glass-card"><span className="stat-number" data-count={certificates.length}>{statValue(certificates.length)}</span><span className="stat-label">Certificates</span></PortfolioJump>
            <PortfolioJump tab="projects" className="stat-card glass-card"><span className="stat-number" data-count={completedProjects}>{statValue(completedProjects)}</span><span className="stat-label">Completed works</span></PortfolioJump>
          </div></div>
        </div>
      </section>

      <section className="section portfolio-section" id="portfolio">
        <div className="section-heading"><p className="section-index" data-reveal="fade">03 / Work</p><h2 data-reveal="lines">Selected work &<br />curious experiments.</h2><p data-reveal="fade">A few projects I’ve worked on. AI integrations are called out so their role is easy to spot.</p></div>
        <PortfolioExplorer />
      </section>

      <section className="section" id="github">
        <div className="section-heading"><p className="section-index" data-reveal="fade">04 / Activity</p><h2 data-reveal="lines">Shipping<br />in public.</h2><p data-reveal="fade">Live from GitHub: what I’ve been pushing lately, refreshed every hour.</p></div>
        <GithubActivity user={profile.githubUser} profileUrl={profile.github} />
      </section>

      <section className="section" id="services">
        <div className="section-heading"><p className="section-index" data-reveal="fade">05 / Services</p><h2 data-reveal="lines">Ways I can help.</h2><p data-reveal="fade">Here’s what I can build for you.</p></div>
        <div className="services-grid" data-reveal="stagger">{services.map((service) => <article className="service-card glass-card" key={service.number} data-spotlight=""><span className="service-num">{service.number} / SERVICE</span><h3>{service.title}</h3><p>{service.description}</p></article>)}</div>
        <div className="process-row glass-card" aria-label="How I work" data-process="">
          <span className="process-rail" data-process-rail="" aria-hidden="true" />
          {processSteps.map((step, index) => <span className="process-step" key={step} data-process-step=""><b>{String(index + 1).padStart(2, "0")}</b> {step}</span>)}
        </div>
      </section>

      <section className="section" id="contact">
        <div className="section-heading"><p className="section-index" data-reveal="fade">06 / Contact</p><h2 data-reveal="lines">Let’s build something<br />worth sharing.</h2><p data-reveal="fade">Have a project, opportunity, or collaboration in mind? Reach out.</p></div>
        <div className="contact-grid is-single" data-reveal="stagger">
          <section className="contact-panel glass-card" data-spotlight=""><h3>Connect with me</h3><p>Email me directly, browse what I’m building on GitHub, or ask the chat assistant in the corner.</p><div className="social-list">
            {profile.github.startsWith("https://") ? <a className="social-link" href={profile.github} target="_blank" rel="noreferrer"><span>GitHub</span><span>↗</span></a> : <div className="social-link social-link-placeholder" aria-disabled="true"><span>GitHub</span><span>Link coming soon</span></div>}
            {profile.linkedin.startsWith("https://") ? <a className="social-link" href={profile.linkedin} target="_blank" rel="noreferrer"><span>LinkedIn</span><span>↗</span></a> : <div className="social-link social-link-placeholder" aria-disabled="true"><span>LinkedIn</span><span>Link coming soon</span></div>}
            {profile.email.includes("@") ? <a className="social-link" href={`mailto:${profile.email}`}><span>Email</span><span>↗</span></a> : <div className="social-link social-link-placeholder" aria-disabled="true"><span>Email</span><span>Address coming soon</span></div>}
          </div></section>
        </div>
      </section>
      <footer className="footer"><span className="footer-big" aria-hidden="true"><ArchWordmark /></span>© {new Date().getFullYear()} {profile.name} · BUILT WITH CARE</footer>
    </main>
    <SectionRail />
    <ScrollReveals />
    <ChatMascot />
  </>;
}
