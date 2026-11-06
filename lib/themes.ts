export const themes = [
  {
    id: "dark",
    en: "Premium Dark",
    he: "כהה פרימיום",
    background: "#010403",
    surface: "#101813",
    accent: "#36e28a",
  },
  {
    id: "light",
    en: "Clean Light",
    he: "בהיר נקי",
    background: "#f2f5f2",
    surface: "#ffffff",
    accent: "#177144",
  },
  {
    id: "midnight",
    en: "Midnight Pro",
    he: "כחול חצות",
    background: "#070e20",
    surface: "#12213b",
    accent: "#69b6ff",
  },
  {
    id: "purple",
    en: "Neon Purple",
    he: "סגול ניאון",
    background: "#10091b",
    surface: "#231333",
    accent: "#d3a1ff",
  },
  {
    id: "system",
    en: "System",
    he: "לפי המכשיר",
    background: "#e7e9ed",
    surface: "#ffffff",
    accent: "#177144",
  },
] as const;
export type Theme = (typeof themes)[number]["id"];
export function resolveTheme(
  theme: Theme,
  prefersDark: boolean,
): Exclude<Theme, "system"> {
  return theme === "system" ? (prefersDark ? "dark" : "light") : theme;
}
