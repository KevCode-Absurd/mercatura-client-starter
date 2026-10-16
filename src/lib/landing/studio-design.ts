import { env } from "../env";
import { skillFor } from "../skills/card";
export function commerceDesignText(): string {
    const guidance = env.SKILLS_DIR ? skillFor("ecommerce-page-design") : "";
    return guidance || "Use the existing D2C brand identity and approved scope. Commit palette roles, typography, one focal move and responsive layout before rendering. Inspect actual readability, contrast, keyboard access and buying clarity separately from conversion claims. Missing evidence stays unverified.";
}
