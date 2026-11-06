export type TechGroup = {
  name: string;
  items: string[];
};

// Keep this public list limited to technologies that are okay to disclose.
// The Tech Stack tab and the scrolling strip under the hero both read from here.
export const techStack: TechGroup[] = [
  { name: "Languages", items: ["Java", "C#", "Python"] },
  { name: "Frontend", items: ["HTML", "CSS", "React", "Next.js"] },
  { name: "Backend", items: ["Node.js", "ASP.NET", "FastAPI"] },
  { name: "Data", items: ["SQL", "Supabase"] },
  { name: "Desktop", items: ["JavaFX"] },
];

export const techStackItems = techStack.flatMap((group) => group.items);
