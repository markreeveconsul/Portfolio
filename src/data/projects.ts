export type ProjectStatus = "Completed" | "In progress";

/**
 * Optional case-study content. Every field is optional: the detail page only
 * renders a section once its field is filled in, so nothing half-written ships.
 */
export type CaseStudy = {
  /** Your role, e.g. "Solo developer" or "Backend developer (team of 4)". */
  role?: string;
  /** e.g. "Aug – Oct 2026" or "6 weeks". */
  timeline?: string;
  /** What problem the project solves and for whom. */
  problem?: string;
  /** How you approached it, one step per entry. */
  approach?: string[];
  /** Results: what shipped, what worked, numbers if you have them. */
  outcome?: string;
  /** Lessons learned, one per entry. */
  learnings?: string[];
  /** Screenshots in /public/images/projects/... */
  gallery?: { src: string; alt: string; caption?: string }[];
};

export type PortfolioProject = {
  slug: string;
  name: string;
  eyebrow: string;
  summary: string;
  description: string;
  status: ProjectStatus;
  featured?: boolean;
  aiIntegrated?: boolean;
  technologies: string[];
  features: string[];
  image: string;
  imageAlt: string;
  demoUrl?: string;
  githubUrl?: string;
  /** "owner/name" of the public GitHub repo; enables live language and activity stats. */
  repo?: string;
  caseStudy?: CaseStudy;
};

export const projects: PortfolioProject[] = [
  {
    slug: "forge",
    name: "FORGE",
    eyebrow: "Desktop application · AI features in progress",
    summary: "A JavaFX desktop store for a tech shop: customers buy PC parts and gaming gear, and the owner manages products, photos and stock.",
    description: "A JavaFX desktop e-commerce application for a small technology shop, built on SQLite.",
    status: "Completed",
    featured: true,
    technologies: ["Java", "JavaFX", "SQLite", "CSS"],
    features: [
      "Product search and filters",
      "Cart drawer and checkout with two payment methods",
      "Order history",
      "Admin product editor with photo upload and stock management",
      "AI shop assistant and admin tool-calling assistant (designed, in progress)",
    ],
    image: "/images/forge%20screenshots/forge1.png",
    imageAlt: "Screenshot of FORGE, the JavaFX e-commerce tech shop",
    githubUrl: "https://github.com/markreeveconsul/FORGE",
    repo: "markreeveconsul/FORGE",
    caseStudy: {
      role: "Full stack developer: JavaFX interface, service layer, SQLite storage, and screen design",
      timeline: "October 8 – 24, 2026",
      problem: "A small tech shop needs one system where customers can find and buy PC parts and gaming gear, and the owner can manage products, photos and stock without touching a database.",
      approach: [
        "Built with Java and JavaFX, split into three layers (screens, services, repositories) on top of SQLite.",
        "One stylesheet controls the whole look, so the design can change in one place.",
        "Drew wireframes alongside the code to design each screen.",
        "A GUI smoke test drives the real screens to check they work end to end.",
      ],
      outcome: "A working store with search, filters, a cart drawer, checkout with two payment methods, order history, and an admin editor with photo upload. The AI features, a shop assistant and an admin tool-calling assistant, are designed and in progress.",
      learnings: [
        "Keeping screens, rules and storage in separate layers let me redesign the whole look without touching the logic.",
        "Testing the real screens caught problems that code review would have missed.",
      ],
      gallery: [1, 2, 3, 4, 5].map((n) => ({ src: `/images/forge%20screenshots/forge${n}.png`, alt: `FORGE screenshot ${n}` })),
    },
  },
  {
    slug: "portfolio-studio",
    name: "Portfolio Studio",
    eyebrow: "Full stack web app",
    summary: "A web app where students create, save and customize a private portfolio from five templates.",
    description: "A full stack web app for student portfolios. Portfolio details and photos are visible only to their owner and authorized admins.",
    status: "Completed",
    technologies: ["React", "TypeScript", "Vite", "Supabase", "PostgreSQL", "Vercel", "Vitest"],
    features: [
      "Five portfolio templates",
      "Email and Google sign-in",
      "Private profile photo storage",
      "Admin view",
      "Privacy rules enforced in the database (Row Level Security)",
    ],
    image: "/images/potfolio_studio%20screenshots/folio1.png",
    imageAlt: "Screenshot of Portfolio Studio, the student portfolio builder",
    demoUrl: "https://myfolio-studio.vercel.app",
    githubUrl: "https://github.com/markreeveconsul/Portfolio-Studio",
    repo: "markreeveconsul/Portfolio-Studio",
    caseStudy: {
      role: "Full stack developer, built independently",
      timeline: "October 2026, about three weeks",
      problem: "Students need a straightforward way to present their education, skills, projects and experience, while keeping their personal information and profile photos protected.",
      approach: [
        "Built the interface with React, TypeScript and Vite.",
        "Used Supabase for authentication, the PostgreSQL database, access policies, and private photo storage.",
        "Added five portfolio templates, email and Google sign-in, and an admin view.",
        "Tested with Vitest, Testing Library and PGlite, and deployed through Vercel.",
      ],
      outcome: "Deployed at myfolio-studio.vercel.app, with the main features working in testing.",
      learnings: [
        "How the frontend, database, authentication, storage and hosting fit together in a full stack app.",
        "Building privacy rules into the database itself, and improving the interface through testing and iteration.",
      ],
      gallery: [1, 2, 3].map((n) => ({ src: `/images/potfolio_studio%20screenshots/folio${n}.png`, alt: `Portfolio Studio screenshot ${n}` })),
    },
  },
  {
    slug: "thesa",
    name: "Thesa",
    eyebrow: "AI assistant · In progress",
    summary: "An AI thesis assistant that answers questions about uploaded documents and PDFs.",
    description: "An in-progress thesis assistant that answers questions about uploaded documents and PDFs. A fuller walkthrough can be added as the project develops.",
    status: "In progress",
    aiIntegrated: true,
    technologies: ["Document Q&A", "PDFs"],
    features: ["Question answering over uploaded documents and PDFs", "Document upload"],
    image: "/images/thesa%20screenshots/thesa1.png",
    imageAlt: "Screenshot of Thesa, the AI thesis assistant",
    githubUrl: "https://github.com/markreeveconsul/Thesa",
    repo: "markreeveconsul/Thesa",
    caseStudy: {
      gallery: [1, 2, 3].map((n) => ({ src: `/images/thesa%20screenshots/thesa${n}.png`, alt: `Thesa screenshot ${n}` })),
    },
  },
  {
    slug: "netpath",
    name: "NetPath",
    eyebrow: "Learning web app · In progress",
    summary: "A web app for learning networking, with a simulation sandbox.",
    description: "An in-progress web app for learning networking concepts, with a simulation sandbox. A fuller walkthrough can be added as the project develops.",
    status: "In progress",
    technologies: ["Web app", "Networking education"],
    features: ["Networking learning experience", "Simulation sandbox"],
    image: "/images/netpath%20screenshots/netpath1.png",
    imageAlt: "Screenshot of NetPath, the networking learning web app",
    githubUrl: "https://github.com/markreeveconsul/NetPath",
    repo: "markreeveconsul/NetPath",
    caseStudy: {
      gallery: [1, 2, 3].map((n) => ({ src: `/images/netpath%20screenshots/netpath${n}.png`, alt: `NetPath screenshot ${n}` })),
    },
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
