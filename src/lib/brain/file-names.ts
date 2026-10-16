export const TAB_OF_FILE: Record<string, {
    label: string;
    href: string;
}> = {
    "brain.md": { label: "Overview", href: "/brand" },
    "brand-guidelines.md": { label: "Guidelines", href: "/brand?tab=guidelines" },
    "products-and-positioning.md": { label: "Products", href: "/brand?tab=products" },
    "customer-avatars.md": { label: "Customers", href: "/brand?tab=customers" },
    "competitors.md": { label: "Competitors", href: "/brand?tab=competitors" },
    "winning-ads.md": { label: "Winning ads", href: "/brand?tab=winning" },
    "recent-changes.md": { label: "Changes", href: "/brand?tab=changes" },
};
const NAMES = Object.keys(TAB_OF_FILE)
    .map((f) => f.replace(".", "[.]"))
    .join("|");
export const fileName = () => new RegExp(`(?<![\\w/.-])(${NAMES})(?![\\w-])`, "g");
export const tabNames = (text: string) => text.replace(fileName(), (f) => `the ${TAB_OF_FILE[f].label} tab`);
