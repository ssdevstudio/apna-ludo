export type BoardThemeId = "classic" | "neon" | "nature" | "royal" | "candy";

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  icon: string;
  description: string;
  boardBg: string;
  borderColor: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "classic",
    name: "Classic Wood",
    icon: "🪵",
    description: "Traditional wooden texture with warm parchment board.",
    boardBg: "#ffffff",
    borderColor: "#b45309",
  },
  {
    id: "neon",
    name: "Neon Disco",
    icon: "🪩",
    description: "Cyberpunk midnight dark floor with glowing electric tracks.",
    boardBg: "#0f172a",
    borderColor: "#06b6d4",
  },
  {
    id: "nature",
    name: "Nature Forest",
    icon: "🍃",
    description: "Lush green meadow with bamboo borders and earthy tiles.",
    boardBg: "#064e3b",
    borderColor: "#10b981",
  },
  {
    id: "royal",
    name: "Royal Gold",
    icon: "👑",
    description: "Imperial gold trim with rich jewel-toned safe squares.",
    boardBg: "#1e1b4b",
    borderColor: "#f59e0b",
  },
  {
    id: "candy",
    name: "Candy World",
    icon: "🍭",
    description: "Sugary sweet pastel palette with peppermint swirls.",
    boardBg: "#fdf2f8",
    borderColor: "#ec4899",
  },
];

const STORAGE_THEME_KEY = "apna_board_theme_v1";

export function getActiveBoardTheme(): BoardThemeId {
  try {
    const val = localStorage.getItem(STORAGE_THEME_KEY);
    if (val && ["classic", "neon", "nature", "royal", "candy"].includes(val)) {
      return val as BoardThemeId;
    }
  } catch {}
  return "classic";
}

export function setActiveBoardTheme(themeId: BoardThemeId): void {
  try {
    localStorage.setItem(STORAGE_THEME_KEY, themeId);
  } catch {}
  if (typeof window !== "undefined") {
    document.documentElement.setAttribute("data-board-theme", themeId);
    window.dispatchEvent(new CustomEvent("board-theme-changed", { detail: themeId }));
  }
}
