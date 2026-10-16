import { creatorSummary, isWinner, nextStep } from "./creators";
import { IDEA_STATUS_LABEL, PLAN_WEEKS, SHOOT_PIECES } from "./ideas";
import { loadOrganic, planRows } from "./store";
export function organicReport(brandId: string): {
    title: string;
    summary: string;
    sections: {
        heading: string;
        lines: string[];
    }[];
    links: {
        label: string;
        href: string;
    }[];
    asks: string[];
} {
    const file = loadOrganic(brandId);
    const rows = planRows(file);
    const today = new Date().toISOString().slice(0, 10);
    const posted = rows.filter((r) => r.status === "posted").length;
    const next = rows.find((r) => r.status !== "posted");
    const s = creatorSummary(file.creators, today);
    const winners = file.creators.filter((c) => isWinner(c));
    return {
        title: "The organic plan",
        summary: `${posted} of ${PLAN_WEEKS} founder videos posted.${next ? ` Next: week ${next.idea.week}, ${next.idea.name.toLowerCase()} (${IDEA_STATUS_LABEL[next.status].toLowerCase()}).` : " All 10 are posted."} ${file.creators.length ? `${s.sent} creator${s.sent === 1 ? "" : "s"} sent the product, ${s.posted} posted, ${s.winners} at twice their usual views.` : "No creators on the list yet."}`,
        sections: [
            { heading: "The 10 videos, 1 a week", lines: rows.map((r) => `Week ${r.idea.week}. ${r.idea.name}: "${r.idea.opens}" (${IDEA_STATUS_LABEL[r.status].toLowerCase()})${r.idea.needs ? ` Needs: ${r.idea.needs}` : ""}`) },
            { heading: `1 shoot, ${SHOOT_PIECES.length} pieces`, lines: SHOOT_PIECES.map((p) => `${p.what}: ${p.where.toLowerCase()}`) },
            ...(winners.length ? [{ heading: "Creators worth running as an ad", lines: winners.map((c) => `${c.handle}: ${c.views.toLocaleString("en-US")} views against a usual ${c.avg_views.toLocaleString("en-US")}. ${nextStep(c, today)}`) }] : []),
        ],
        links: [
            { label: "Open Organic", href: "/organic" },
            { label: "Open the creators list", href: "/organic?tab=creators" },
        ],
        asks: [],
    };
}
