import portfolioFacts from "../../backend/app/portfolio_facts.json";

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
    technologies: portfolioFacts.projectTechnologies.forge,
    features: [
      "Product search and filters",
      "Cart drawer and checkout with two payment methods",
      "Order history",
      "Admin product editor with photo upload and stock management",
      "AI shop assistant and admin tool-calling assistant (designed, in progress)",
    ],
    image: "/images/forge-screenshots/forge1.png",
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
      gallery: [
        { src: "/images/forge-screenshots/forge1.png", alt: "FORGE sign-in screen with account access and a desktop storefront preview", caption: "Account sign-in and storefront entry screen." },
        { src: "/images/forge-screenshots/forge2.png", alt: "FORGE customer storefront with category navigation, product search, and product cards", caption: "Customer storefront with product categories, search, and product listings." },
        { src: "/images/forge-screenshots/forge3.png", alt: "FORGE AI assistant returning matching PC products with prices and stock details", caption: "FORGE AI searches the catalog and shows matching products with prices and stock details." },
        { src: "/images/forge-screenshots/forge4.png", alt: "FORGE admin overview with product, low-stock, order, customer, and revenue metrics", caption: "Admin overview for inventory, orders, customers, and revenue." },
        { src: "/images/forge-screenshots/forge5.png", alt: "FORGE AI Neural Manager command workspace for store operations", caption: "Admin AI workspace prototype; the command assistant is still in progress." },
      ],
    },
  },
  {
    slug: "portfolio-studio",
    name: "Portfolio Studio",
    eyebrow: "Full stack web app",
    summary: "A web app where students create, save and customize a private portfolio from five templates.",
    description: "A full stack web app for student portfolios. Portfolio details and photos are visible only to their owner and authorized admins.",
    status: "Completed",
    technologies: portfolioFacts.projectTechnologies["portfolio-studio"],
    features: [
      "Five portfolio templates",
      "Email and Google sign-in",
      "Private profile photo storage",
      "Admin view",
      "Privacy rules enforced in the database (Row Level Security)",
    ],
    image: "/images/portfolio-studio-screenshots/folio1.png",
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
      gallery: [
        { src: "/images/portfolio-studio-screenshots/folio1.png", alt: "Portfolio Studio landing page introducing its private portfolio builder", caption: "Landing page introducing the private portfolio builder." },
        { src: "/images/portfolio-studio-screenshots/folio2.png", alt: "Portfolio Studio editor for personal details with optional profile photo upload", caption: "Portfolio editor for personal details, optional photo upload, and saving changes." },
        { src: "/images/portfolio-studio-screenshots/folio3.png", alt: "Portfolio Studio template picker above a preview of the saved portfolio", caption: "Template picker and preview of the saved portfolio." },
      ],
    },
  },
  {
    slug: "thesa",
    name: "Thesa",
    eyebrow: "Thesis workspace · In progress",
    summary: "A thesis-writing workspace that keeps chapters and research sources together, with a cited AI source-chat preview.",
    description: "An in-progress thesis workspace with a structured editor, source uploads and reading, autosave, and an AI assistant that answers from selected sources with passage citations.",
    status: "In progress",
    aiIntegrated: true,
    technologies: portfolioFacts.projectTechnologies.thesa,
    features: [
      "Start from a five-chapter thesis template or a blank outline, with APA, MLA, or IEEE preference",
      "Rich-text chapter editor with footnotes, tables, find/replace, and word count",
      "Upload and read PDF, DOCX, and TXT sources, with page navigation and text search",
      "Preview an AI source assistant that answers from retrieved passages and links back to the source page",
      "Autosave, revision-conflict recovery, browser drafts, and JSON chapter backups",
    ],
    image: "/images/thesa-screenshots/thesa1.png",
    imageAlt: "Screenshot of Thesa, the AI thesis assistant",
    githubUrl: "https://github.com/markreeveconsul/Thesa",
    repo: "markreeveconsul/Thesa",
    caseStudy: {
      role: "Developer",
      problem: "Keep the research question, chapter drafts, and source material together while making answers traceable to the documents being read.",
      approach: [
        "Built a chapter-based writing workspace with a rich-text editor, a five-chapter template, and citation-style preferences.",
        "Added document upload and reading for PDF, DOCX, and TXT files, including page navigation and text search.",
        "Connected a local-preview Gemini assistant to semantic and keyword search over selected sources; answers include a quotation and a file/page location.",
        "Added autosave, revision-conflict handling, browser-draft recovery, and JSON backups.",
      ],
      outcome: "The local preview supports writing, source reading, and cited source Q&A. The assistant is a local preview; cloud source imports still need the latest database migration, and citation insertion plus DOCX/PDF export remain unfinished.",
      gallery: [
        { src: "/images/thesa-screenshots/thesa1.png", alt: "Thesa sign-in page beside an illustrated preview of its source-backed writing workspace", caption: "Sign-in and product introduction." },
        { src: "/images/thesa-screenshots/thesa2.png", alt: "Thesa dashboard for starting a thesis from a research problem and choosing citation style and structure", caption: "New thesis setup with a research problem, citation style, and outline choice." },
        { src: "/images/thesa-screenshots/thesa3.png", alt: "Thesa chapter editor with research sources and the Otto assistant", caption: "Chapter editor with the Otto source-chat preview open." },
      ],
    },
  },
  {
    slug: "netpath",
    name: "NetPath",
    eyebrow: "Local learning app · In progress",
    summary: "A local networking classroom for CCNA practice, with original lessons, subnetting tools, Packet Tracer companion labs, and a network sandbox.",
    description: "An offline-capable, single-user networking classroom with lessons, practice tools, and Packet Tracer companion guides. It runs locally and is not a hosted website.",
    status: "In progress",
    technologies: portfolioFacts.projectTechnologies.netpath,
    features: [
      "37 lessons across eight modules and 181 original practice questions",
      "IPv4 subnetting trainer and saved VLSM planner",
      "Hands-on network sandbox with editable device configurations",
      "18 Packet Tracer companion labs and an IOS-style VLAN command sandbox",
      "Local SQLite progress, recovery snapshots, and JSON backup export/import",
    ],
    image: "/images/netpath-screenshots/netpath1.png",
    imageAlt: "Screenshot of NetPath, the networking learning web app",
    githubUrl: "https://github.com/markreeveconsul/NetPath",
    repo: "markreeveconsul/NetPath",
    caseStudy: {
      role: "Developer",
      problem: "Make networking practice more hands-on and easier to revisit, including when working offline or without a paid service.",
      approach: [
        "Created original lessons, timed practice sessions, review cards, and a study plan around networking fundamentals and CCNA topics.",
        "Built a subnetting trainer, VLSM planner, and a bounded IOS-style VLAN command sandbox.",
        "Added a visual network sandbox, Packet Tracer companion guides, and a local SQLite API for saving progress and backups.",
      ],
      outcome: "The current local release includes lessons, practice tools, and saved progress. It is single-user and local-only; cloud sync, AI tutoring, live Packet Tracer integration, and full CCNA curriculum coverage are not included.",
      gallery: [
        { src: "/images/netpath-screenshots/netpath1.png", alt: "NetPath local networking classroom dashboard with a lesson card and visual lab guide", caption: "The local classroom dashboard and learning path." },
        { src: "/images/netpath-screenshots/netpath2.png", alt: "NetPath network sandbox with connected PCs, switches, routers, and a device configuration inspector", caption: "Editable network topology and device configuration." },
        { src: "/images/netpath-screenshots/netpath3.png", alt: "NetPath practitioner exam page with sample networking certificates and export options", caption: "Practitioner exam page with sample certificates and PNG or PDF export options." },
      ],
    },
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
