export type TechGroup = {
  name: string;
  items: string[];
};

// Keep this public list limited to technologies that are okay to disclose.
export const techStack: TechGroup[] = [
  { name: "Languages", items: ["Java"] },
  { name: "Frameworks", items: ["JavaFX"] },
];
