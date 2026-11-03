export type TechGroup = {
  name: string;
  items: string[];
};

// Keep this public list limited to technologies that are okay to disclose.
export const techStack: TechGroup[] = [
  { name: "Languages", items: ["Java", "[TODO: add languages you use]"] },
  { name: "Frameworks", items: ["JavaFX", "[TODO: add frameworks you want to share]"] },
];
