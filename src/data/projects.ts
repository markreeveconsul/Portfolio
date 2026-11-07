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
    slug: "javafx-e-commerce-tech-shop",
    name: "JavaFX E-Commerce Tech Shop",
    eyebrow: "Desktop application · AI integration",
    summary: "A desktop e-commerce project for a technology shop, with an AI integration.",
    description: "A completed JavaFX desktop application for a technology shop, with an AI integration. A fuller walkthrough can be added when the project details are ready to share.",
    status: "Completed",
    featured: true,
    aiIntegrated: true,
    technologies: ["Java", "JavaFX", "OOP"],
    features: ["Desktop e-commerce experience for a technology shop", "AI-integrated functionality", "Object-oriented implementation"],
    image: "/images/javafx-ecommerce-placeholder.svg",
    imageAlt: "Abstract placeholder preview for the JavaFX E-Commerce Tech Shop project",
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
