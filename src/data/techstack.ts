import portfolioFacts from "../../backend/app/portfolio_facts.json";

export type TechGroup = {
  name: string;
  items: string[];
};

// This curated, public list also feeds the chatbot's approved facts.
export const techStack: TechGroup[] = portfolioFacts.techStack;

export const techStackItems = techStack.flatMap((group) => group.items);

export const projectTechnologies = portfolioFacts.projectTechnologies;
