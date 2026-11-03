export type ProjectStatus = "Completed" | "In progress";

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
};

export const projects: PortfolioProject[] = [
  {
    slug: "javafx-e-commerce-tech-shop",
    name: "JavaFX E-Commerce Tech Shop",
    eyebrow: "Desktop application · AI integration",
    summary: "A desktop e-commerce project for a technology shop, with an AI integration.",
    description: "A completed JavaFX desktop application for a technology shop with AI-powered functionality. Add the exact customer flow, what the AI helps with, and your contribution once confirmed.",
    status: "Completed",
    featured: true,
    aiIntegrated: true,
    technologies: ["Java", "JavaFX", "OOP"],
    features: ["E-commerce desktop application · [TODO: describe the implemented flow]", "AI integration · [TODO: describe what the AI does]", "Object-oriented implementation"],
    image: "/images/javafx-ecommerce-placeholder.svg",
    imageAlt: "Abstract placeholder preview for the JavaFX E-Commerce Tech Shop project",
  },
  {
    slug: "thesa",
    name: "Thesa",
    eyebrow: "AI assistant · In progress",
    summary: "An AI thesis assistant that answers questions about uploaded documents and PDFs.",
    description: "An in-progress AI thesis assistant that helps users ask questions about uploaded documents and PDFs. Add the supported file types, how it works at a high level, and your role when confirmed.",
    status: "In progress",
    aiIntegrated: true,
    technologies: ["Document Q&A", "PDFs"],
    features: ["Question answering over uploaded documents and PDFs", "Document upload · [TODO: supported formats]", "[TODO: add another confirmed feature]"],
    image: "/images/thesa-placeholder.svg",
    imageAlt: "Abstract placeholder preview for the Thesa AI thesis assistant",
  },
  {
    slug: "netpath",
    name: "NetPath",
    eyebrow: "Learning web app · In progress",
    summary: "A web app for learning networking, with a simulation sandbox.",
    description: "An in-progress web app designed to teach networking concepts and provide a simulation sandbox. Add the intended audience, topics, and current sandbox capabilities once confirmed.",
    status: "In progress",
    technologies: ["Web app", "Networking education", "[TODO: frontend stack]"],
    features: ["Networking learning experience", "Simulation sandbox", "[TODO: add another confirmed feature]"],
    image: "/images/netpath-placeholder.svg",
    imageAlt: "Abstract placeholder preview for the NetPath networking learning project",
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
