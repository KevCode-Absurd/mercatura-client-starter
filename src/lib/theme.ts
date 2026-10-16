export type Theme = "light" | "dark";
export const THEME_COOKIE = "ce_theme";
export const themeOf = (v: string | undefined): Theme => (v === "dark" ? "dark" : "light");
